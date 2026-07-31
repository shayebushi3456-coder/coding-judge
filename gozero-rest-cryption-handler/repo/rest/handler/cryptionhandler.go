package handler

import (
	"net/http"
)

const maxBytes = 1 << 20 // 1 MiB

// CryptionHandler returns a middleware to handle cryption.
func CryptionHandler(key []byte) func(http.Handler) http.Handler {
	return LimitCryptionHandler(maxBytes, key)
}

// LimitCryptionHandler returns a middleware to handle cryption.
func LimitCryptionHandler(limitBytes int64, key []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r)
		})
	}
}
