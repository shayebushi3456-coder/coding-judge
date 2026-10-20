package miniasynq

import (
	"errors"
	"sync"
	"time"
)

var ErrDuplicateTask = errors.New("task already exists with unique key")

type Client struct {
	mu      sync.Mutex
	queue   []*Task
	unique  map[string]time.Time // key -> expire
	clock   func() time.Time
	archive []*Task
}

func NewClient() *Client {
	return &Client{
		unique: map[string]time.Time{},
		clock:  time.Now,
	}
}

func (c *Client) Enqueue(task *Task) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if task.ProcessAt.IsZero() {
		task.ProcessAt = c.clock()
	}
	// Unique + scheduling semantics are incomplete in the problem field.
	c.queue = append(c.queue, cloneTask(task))
	return nil
}

func (c *Client) SnapshotQueue() []*Task {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]*Task, len(c.queue))
	for i, t := range c.queue {
		out[i] = cloneTask(t)
	}
	return out
}

func (c *Client) SnapshotArchive() []*Task {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]*Task, len(c.archive))
	for i, t := range c.archive {
		out[i] = cloneTask(t)
	}
	return out
}

func cloneTask(t *Task) *Task {
	cp := *t
	if t.Payload != nil {
		cp.Payload = append([]byte(nil), t.Payload...)
	}
	return &cp
}
