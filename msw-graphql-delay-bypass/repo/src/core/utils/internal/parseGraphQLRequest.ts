import type { DocumentNode, OperationTypeNode } from 'graphql'
import type { GraphQLVariables } from '../../handlers/GraphQLHandler'

export interface ParsedGraphQLQuery {
  operationType: OperationTypeNode
  operationName?: string
}

export type ParsedGraphQLRequest<
  VariablesType extends GraphQLVariables = GraphQLVariables,
> =
  | (ParsedGraphQLQuery & {
      query: string
      variables?: VariablesType
    })
  | undefined

export function parseDocumentNode(node: DocumentNode): ParsedGraphQLQuery {
  return {
    operationType: 'query' as OperationTypeNode,
    operationName: undefined,
  }
}

export type GraphQLParsedOperationsMap = Record<string, string[]>
export type GraphQLMultipartRequestBody = {
  operations: string
  map?: string
} & {
  [fileName: string]: File
}

/**
 * Determines if a given request can be considered a GraphQL request.
 * Does not parse the query and does not guarantee its validity.
 */
export async function parseGraphQLRequest(
  request: Request,
): Promise<ParsedGraphQLRequest> {
  return undefined
}
