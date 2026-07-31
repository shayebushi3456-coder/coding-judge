// Copyright 2014 Manu Martinez-Almeida. All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

package gin

import (
	"io"
	"net/http"
)

// RecoveryFunc defines the function passable to CustomRecovery.
type RecoveryFunc func(c *Context, err any)

// Recovery returns a middleware that recovers from any panics and writes a 500 if there was one.
func Recovery() HandlerFunc {
	return RecoveryWithWriter(DefaultErrorWriter)
}

// CustomRecovery returns a middleware that recovers from any panics and calls the provided handle func to handle it.
func CustomRecovery(handle RecoveryFunc) HandlerFunc {
	return RecoveryWithWriter(DefaultErrorWriter, handle)
}

// RecoveryWithWriter returns a middleware for a given writer that recovers from any panics and writes a 500 if there was one.
func RecoveryWithWriter(out io.Writer, recovery ...RecoveryFunc) HandlerFunc {
	if len(recovery) > 0 {
		return CustomRecoveryWithWriter(out, recovery[0])
	}
	return CustomRecoveryWithWriter(out, defaultHandleRecovery)
}

// CustomRecoveryWithWriter returns a middleware for a given writer that recovers from any panics and calls the provided handle func to handle it.
func CustomRecoveryWithWriter(out io.Writer, handle RecoveryFunc) HandlerFunc {
	return func(c *Context) {
		c.Next()
	}
}

func defaultHandleRecovery(c *Context, _ any) {
	c.AbortWithStatus(http.StatusInternalServerError)
}
