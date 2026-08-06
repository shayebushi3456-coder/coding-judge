'use strict';

import utils from './../utils.js';
import AxiosError from '../core/AxiosError.js';

const isHttpAdapterSupported = typeof process !== 'undefined' && utils.kindOf(process) === 'process';

export default isHttpAdapterSupported && function httpAdapter(config) {
  return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
};

export const __setProxy = function setProxy(options) {
  return options;
};
