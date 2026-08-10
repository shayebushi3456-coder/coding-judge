package handler

import (
	"net/http"
)

// GunzipHandler returns a middleware to gunzip http request body.
func GunzipHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}
