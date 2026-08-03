import type { QueryBehavior } from './query'
import type { InfiniteData, InfiniteQueryPageParamsOptions } from './types'

export function infiniteQueryBehavior<TQueryFnData, TError, TData, TPageParam>(
  _pages?: number,
): QueryBehavior<TQueryFnData, TError, InfiniteData<TData, TPageParam>> {
  return {
    onFetch: () => {},
  }
}

export function hasNextPage(
  _options: InfiniteQueryPageParamsOptions<any, any>,
  _data?: InfiniteData<unknown>,
): boolean {
  return false
}

export function hasPreviousPage(
  _options: InfiniteQueryPageParamsOptions<any, any>,
  _data?: InfiniteData<unknown>,
): boolean {
  return false
}
