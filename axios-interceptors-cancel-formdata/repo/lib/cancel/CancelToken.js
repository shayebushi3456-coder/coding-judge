'use strict';

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    this.promise = new Promise(function promiseExecutor() {});

    executor(function cancel() {});
  }

  throwIfRequested() {}

  subscribe() {}

  unsubscribe() {}

  toAbortSignal() {
    const controller = new AbortController();
    return controller.signal;
  }

  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}

export default CancelToken;
