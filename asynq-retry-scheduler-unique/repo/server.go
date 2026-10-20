package miniasynq

import (
	"sync"
	"time"
)

type HandlerFunc func(task *Task) error

type Server struct {
	client    *Client
	handlers  map[string]HandlerFunc
	mu        sync.Mutex
	backoff   func(retryCount int) time.Duration
	now       func() time.Time
}

func NewServer(c *Client) *Server {
	return &Server{
		client:   c,
		handlers: map[string]HandlerFunc{},
		backoff: func(retryCount int) time.Duration {
			// default exponential-ish
			d := time.Second
			for i := 0; i < retryCount; i++ {
				d *= 2
			}
			return d
		},
		now: time.Now,
	}
}

func (s *Server) HandleFunc(typename string, fn HandlerFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[typename] = fn
}

func (s *Server) SetBackoff(fn func(retryCount int) time.Duration) {
	s.backoff = fn
}

// ProcessDue pops due tasks and runs handlers.
// On failure should retry with backoff until MaxRetry then archive.
func (s *Server) ProcessDue() {
	s.client.mu.Lock()
	defer s.client.mu.Unlock()
	now := s.now()
	var remain []*Task
	for _, t := range s.client.queue {
		if t.ProcessAt.After(now) {
			remain = append(remain, t)
			continue
		}
		s.mu.Lock()
		h := s.handlers[t.Type]
		s.mu.Unlock()
		if h == nil {
			remain = append(remain, t)
			continue
		}
		err := h(t)
		if err == nil {
			if t.UniqueKey != "" {
				delete(s.client.unique, t.UniqueKey)
			}
			continue
		}
		// Incomplete: drop failed tasks instead of retry/archive semantics.
		_ = err
	}
	s.client.queue = remain
}
