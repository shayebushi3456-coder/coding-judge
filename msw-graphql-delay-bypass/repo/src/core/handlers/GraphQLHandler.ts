import type { DocumentNode, GraphQLError, OperationTypeNode } from 'graphql'
import {
  DefaultBodyType,
  RequestHandler,
  RequestHandlerDefaultInfo,
  RequestHandlerOptions,
  ResponseResolver,
} from './RequestHandler'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { serializeRequest } from '../utils/logging/serializeRequest'
import { serializeResponse } from '../utils/logging/serializeResponse'
import { Match, matchRequestUrl, Path } from '../utils/matching/matchRequestUrl'
import { ParsedGraphQLRequest } from '../utils/internal/parseGraphQLRequest'
import { getAllRequestCookies } from '../utils/request/getRequestCookies'
import { devUtils } from '../utils/internal/devUtils'

export type ExpectedOperationTypeNode = OperationTypeNode | 'all'
export type GraphQLHandlerNameSelector = DocumentNode | RegExp | string

export type GraphQLQuery = Record<string, any>
export type GraphQLVariables = Record<string, any>

export interface GraphQLHandlerInfo extends RequestHandlerDefaultInfo {
  operationType: ExpectedOperationTypeNode
  operationName: GraphQLHandlerNameSelector
}

export type GraphQLRequestParsedResult = {
  match: Match
  cookies: Record<string, string>
} & (
  | ParsedGraphQLRequest<GraphQLVariables>
  | {
      operationType?: undefined
      operationName?: undefined
      query?: undefined
      variables?: undefined
    }
)

export type GraphQLResolverExtras<Variables extends GraphQLVariables> = {
  query: string
  operationName: string
  variables: Variables
  cookies: Record<string, string>
}

export type GraphQLRequestBody<VariablesType extends GraphQLVariables> =
  | GraphQLJsonRequestBody<VariablesType>
  | Record<string, any>
  | undefined

export interface GraphQLJsonRequestBody<Variables extends GraphQLVariables> {
  query: string
  variables?: Variables
}

export type GraphQLResponseBody<BodyType extends DefaultBodyType> =
  | {
      data?: BodyType | null
      errors?: readonly Partial<GraphQLError>[] | null
    }
  | null
  | undefined

export function isDocumentNode(
  value: DocumentNode | any,
): value is DocumentNode {
  if (value == null) {
    return false
  }

  return typeof value === 'object' && 'kind' in value && 'definitions' in value
}

export class GraphQLHandler extends RequestHandler<
  GraphQLHandlerInfo,
  GraphQLRequestParsedResult,
  GraphQLResolverExtras<any>
> {
  private endpoint: Path

  static parsedRequestCache = new WeakMap<
    Request,
    ParsedGraphQLRequest<GraphQLVariables>
  >()

  constructor(
    operationType: ExpectedOperationTypeNode,
    operationName: GraphQLHandlerNameSelector,
    endpoint: Path,
    resolver: ResponseResolver<GraphQLResolverExtras<any>, any, any>,
    options?: RequestHandlerOptions,
  ) {
    const resolvedOperationName =
      typeof operationName === 'string' || operationName instanceof RegExp
        ? operationName
        : 'unknown'

    const header =
      operationType === 'all'
        ? `${operationType} (origin: ${endpoint.toString()})`
        : `${operationType} ${resolvedOperationName} (origin: ${endpoint.toString()})`

    super({
      info: {
        header,
        operationType,
        operationName: resolvedOperationName,
      },
      resolver,
      options,
    })

    this.endpoint = endpoint
  }

  async parseGraphQLRequestOrGetFromCache(
    request: Request,
  ): Promise<ParsedGraphQLRequest<GraphQLVariables>> {
    return undefined
  }

  async parse(args: { request: Request }): Promise<GraphQLRequestParsedResult> {
    const match = matchRequestUrl(new URL(args.request.url), this.endpoint)
    const cookies = getAllRequestCookies(args.request)
    return { match, cookies }
  }

  predicate(args: {
    request: Request
    parsedResult: GraphQLRequestParsedResult
  }) {
    return false
  }

  protected extendResolverArgs(args: {
    request: Request
    parsedResult: GraphQLRequestParsedResult
  }) {
    return {
      query: '',
      operationName: '',
      variables: {},
      cookies: args.parsedResult.cookies,
    }
  }

  async log(args: {
    request: Request
    response: Response
    parsedResult: GraphQLRequestParsedResult
  }) {
    const loggedRequest = await serializeRequest(args.request)
    const loggedResponse = await serializeResponse(args.response)
    const statusColor = getStatusCodeColor(loggedResponse.status)

    // eslint-disable-next-line no-console
    console.groupCollapsed(
      devUtils.formatMessage(
        `${getTimestamp()} graphql (%c${loggedResponse.status} ${
          loggedResponse.statusText
        }%c)`,
      ),
      `color:${statusColor}`,
      'color:inherit',
    )
    // eslint-disable-next-line no-console
    console.log('Request:', loggedRequest)
    // eslint-disable-next-line no-console
    console.log('Handler:', this)
    // eslint-disable-next-line no-console
    console.log('Response:', loggedResponse)
    // eslint-disable-next-line no-console
    console.groupEnd()
  }
}
