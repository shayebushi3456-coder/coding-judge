package miniasynq

import "time"

type Task struct {
	Type    string
	Payload []byte

	MaxRetry   int
	RetryCount int
	RetriedAt  time.Time

	UniqueKey string
	UniqueTTL time.Duration

	ProcessAt time.Time
}

type Option func(*Task)

func MaxRetry(n int) Option {
	return func(t *Task) { t.MaxRetry = n }
}

func Unique(key string, ttl time.Duration) Option {
	return func(t *Task) {
		t.UniqueKey = key
		t.UniqueTTL = ttl
	}
}

func ProcessAt(at time.Time) Option {
	return func(t *Task) { t.ProcessAt = at }
}

func NewTask(typ string, payload []byte, opts ...Option) *Task {
	t := &Task{Type: typ, Payload: payload, MaxRetry: 0}
	for _, o := range opts {
		o(t)
	}
	return t
}
