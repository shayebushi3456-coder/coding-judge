'use strict';

import utils from '../utils.js';
import PlatformFormData from '../platform/node/classes/FormData.js';

/**
 * Convert a data object to FormData
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData(obj, formData, options) {
  if (!utils.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (PlatformFormData || FormData)();

  utils.forEach(obj, (value, key) => {
    if (utils.isUndefined(value) || value === null) {
      return;
    }
    if (utils.isDate(value)) {
      formData.append(key, value.toISOString());
      return;
    }
    if (utils.isObject(value) && !utils.isFile(value) && !utils.isBlob(value) && !utils.isBuffer(value)) {
      formData.append(key, String(value));
      return;
    }
    formData.append(key, value);
  });

  return formData;
}

export default toFormData;
