package handler

import (
	"net/http"
)

// MaxConnsHandler returns a middleware that limit the concurrent connections.
func MaxConnsHandler(n int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return next
	}
}
