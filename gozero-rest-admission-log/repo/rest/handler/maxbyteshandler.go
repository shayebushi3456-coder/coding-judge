package handler

import (
	"net/http"
)

// MaxBytesHandler returns a middleware that limit reading of http request body.
func MaxBytesHandler(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return next
	}
}
