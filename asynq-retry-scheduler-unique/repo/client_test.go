package miniasynq

import (
	"errors"
	"testing"
	"time"
)

func TestEnqueueBasic(t *testing.T) {
	c := NewClient()
	if err := c.Enqueue(NewTask("ping", []byte("1"))); err != nil {
		t.Fatal(err)
	}
	if len(c.SnapshotQueue()) != 1 {
		t.Fatalf("want 1 queued")
	}
}

func TestUniqueConflict(t *testing.T) {
	c := NewClient()
	fixed := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	c.clock = func() time.Time { return fixed }

	t1 := NewTask("email", []byte("a"), Unique("u1", time.Minute))
	t2 := NewTask("email", []byte("b"), Unique("u1", time.Minute))
	if err := c.Enqueue(t1); err != nil {
		t.Fatal(err)
	}
	if err := c.Enqueue(t2); !errors.Is(err, ErrDuplicateTask) {
		t.Fatalf("want ErrDuplicateTask, got %v", err)
	}
}

func TestUniqueReleasedAfterSuccess(t *testing.T) {
	c := NewClient()
	s := NewServer(c)
	fixed := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	c.clock = func() time.Time { return fixed }
	s.now = func() time.Time { return fixed }

	s.HandleFunc("email", func(task *Task) error { return nil })
	if err := c.Enqueue(NewTask("email", []byte("a"), Unique("u1", time.Minute))); err != nil {
		t.Fatal(err)
	}
	s.ProcessDue()
	if err := c.Enqueue(NewTask("email", []byte("b"), Unique("u1", time.Minute))); err != nil {
		t.Fatalf("unique should release after success: %v", err)
	}
}

func TestRetryThenArchive(t *testing.T) {
	c := NewClient()
	s := NewServer(c)
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	now := base
	c.clock = func() time.Time { return now }
	s.now = func() time.Time { return now }
	s.SetBackoff(func(retryCount int) time.Duration {
		return time.Second
	})

	fails := 0
	s.HandleFunc("job", func(task *Task) error {
		fails++
		return errors.New("boom")
	})
	if err := c.Enqueue(NewTask("job", nil, MaxRetry(2))); err != nil {
		t.Fatal(err)
	}

	// attempt 1 fail -> retry scheduled
	s.ProcessDue()
	if len(c.SnapshotArchive()) != 0 {
		t.Fatalf("should not archive yet")
	}
	if len(c.SnapshotQueue()) != 1 {
		t.Fatalf("want retried task in queue")
	}
	q := c.SnapshotQueue()[0]
	if q.RetryCount != 1 {
		t.Fatalf("RetryCount=%d", q.RetryCount)
	}

	// not due yet
	s.ProcessDue()
	if fails != 1 {
		t.Fatalf("should wait backoff, fails=%d", fails)
	}

	now = now.Add(time.Second)
	s.ProcessDue() // attempt 2
	now = now.Add(time.Second)
	s.ProcessDue() // attempt 3 -> exhaust -> archive

	if len(c.SnapshotArchive()) != 1 {
		t.Fatalf("want archived, archive=%d queue=%d", len(c.SnapshotArchive()), len(c.SnapshotQueue()))
	}
	if fails != 3 {
		t.Fatalf("fails=%d want 3", fails)
	}
}

func TestSchedulerEvery(t *testing.T) {
	c := NewClient()
	sch := NewScheduler(c)
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	now := base
	c.clock = func() time.Time { return now }
	sch.now = func() time.Time { return now }

	if err := sch.RegisterEvery("tick", time.Minute, "tick", []byte("x")); err != nil {
		t.Fatal(err)
	}
	if err := sch.RunDue(); err != nil {
		t.Fatal(err)
	}
	if len(c.SnapshotQueue()) != 0 {
		t.Fatalf("not due yet")
	}
	now = now.Add(time.Minute)
	if err := sch.RunDue(); err != nil {
		t.Fatal(err)
	}
	if len(c.SnapshotQueue()) != 1 {
		t.Fatalf("want 1 enqueued")
	}
	// next period should not double-fire immediately
	if err := sch.RunDue(); err != nil {
		t.Fatal(err)
	}
	if len(c.SnapshotQueue()) != 1 {
		t.Fatalf("should not stack, got %d", len(c.SnapshotQueue()))
	}
	now = now.Add(time.Minute)
	_ = sch.RunDue()
	if len(c.SnapshotQueue()) != 2 {
		t.Fatalf("want second tick, got %d", len(c.SnapshotQueue()))
	}
}
