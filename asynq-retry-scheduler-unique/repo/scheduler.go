package miniasynq

import (
	"sync"
	"time"
)

type Scheduler struct {
	client *Client
	mu     sync.Mutex
	entries []schedEntry
	now    func() time.Time
}

type schedEntry struct {
	id       string
	cronSpec string // simplified: "@every <duration>" or empty for one-shot via next only
	every    time.Duration
	taskType string
	payload  []byte
	opts     []Option
	next     time.Time
}

func NewScheduler(c *Client) *Scheduler {
	return &Scheduler{client: c, now: time.Now}
}

// RegisterEvery registers a periodic task.
func (s *Scheduler) RegisterEvery(id string, every time.Duration, typ string, payload []byte, opts ...Option) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries = append(s.entries, schedEntry{
		id:       id,
		every:    every,
		taskType: typ,
		payload:  append([]byte(nil), payload...),
		opts:     opts,
		next:     s.now().Add(every),
	})
	return nil
}

// RunDue should enqueue tasks whose next <= now, then advance next for periodic entries.
func (s *Scheduler) RunDue() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Incomplete stub: does nothing.
	return nil
}
