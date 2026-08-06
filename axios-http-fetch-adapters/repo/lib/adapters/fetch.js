import utils from "../utils.js";
import AxiosError from "../core/AxiosError.js";

const isFetchSupported = typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function';

export default isFetchSupported && (async function fetchAdapter(config) {
  return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
});
