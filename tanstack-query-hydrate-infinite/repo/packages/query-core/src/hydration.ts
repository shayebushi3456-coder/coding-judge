import type {
  DefaultError,
  MutationOptions,
  QueryOptions,
} from './types'
import type { QueryClient } from './queryClient'
import type { Query } from './query'
import type { Mutation } from './mutation'

type TransformerFn = (data: any) => any

export interface DehydrateOptions {
  serializeData?: TransformerFn
  shouldDehydrateMutation?: (mutation: Mutation) => boolean
  shouldDehydrateQuery?: (query: Query) => boolean
}

export interface HydrateOptions {
  defaultOptions?: {
    deserializeData?: TransformerFn
    queries?: QueryOptions
    mutations?: MutationOptions<unknown, DefaultError, unknown, unknown>
  }
}

export interface DehydratedState {
  mutations: Array<unknown>
  queries: Array<unknown>
}

export function defaultShouldDehydrateMutation(mutation: Mutation) {
  return mutation.state.isPaused
}

export function defaultShouldDehydrateQuery(query: Query) {
  return query.state.status === 'success'
}

export function dehydrate(
  _client: QueryClient,
  _options: DehydrateOptions = {},
): DehydratedState {
  return { mutations: [], queries: [] }
}

export function hydrate(
  _client: QueryClient,
  _dehydratedState: unknown,
  _options?: HydrateOptions,
): void {}
