import { findEndpointErrorsByAlias, findEndpointErrorsByPath } from './utils'
import type {
  Aliases,
  Method,
  ZodiosEndpointDefinitions,
  ZodiosEndpointError,
  ZodiosMatchingErrorsByAlias,
  ZodiosMatchingErrorsByPath,
  ZodiosPathsByMethod,
} from './zodios.types'
import { ZodiosResponseError } from './zodios-error'

function isResponseError(error: unknown): error is ZodiosResponseError {
  // the duck check covers the case where the package is duplicated
  // in the dependency tree and instanceof fails across realms
  return (
    error instanceof ZodiosResponseError ||
    (error instanceof Error && error.name === 'ZodiosResponseError' && 'response' in error)
  )
}

function isDefinedError(
  error: unknown,
  findEndpointErrors: (error: ZodiosResponseError) => ZodiosEndpointError[] | undefined,
): boolean {
  if (isResponseError(error)) {
    const endpointErrors = findEndpointErrors(error)
    if (endpointErrors) {
      return endpointErrors.some((desc) => desc.schema.safeParse(error.response.data).success)
    }
  }
  return false
}

/**
 * check if the error is matching the endpoint errors definitions
 * @param api - the api definition
 * @param method - http method of the endpoint
 * @param path - path of the endpoint
 * @param error - the error to check
 * @returns - if true, the error type is narrowed to the matching endpoint errors
 */
export function isErrorFromPath<
  Api extends ZodiosEndpointDefinitions,
  M extends Method,
  Path extends string,
>(
  api: Api,
  method: M,
  path: Path extends ZodiosPathsByMethod<Api, M> ? Path : ZodiosPathsByMethod<Api, M>,
  error: unknown,
): error is ZodiosMatchingErrorsByPath<
  Api,
  M,
  Path extends ZodiosPathsByMethod<Api, M> ? Path : never
> {
  return isDefinedError(error, (err) => findEndpointErrorsByPath(api, method, path, err))
}

/**
 * check if the error is matching the endpoint errors definitions
 * @param api - the api definition
 * @param alias - alias of the endpoint
 * @param error - the error to check
 * @returns - if true, the error type is narrowed to the matching endpoint errors
 */
export function isErrorFromAlias<Api extends ZodiosEndpointDefinitions, Alias extends string>(
  api: Api,
  alias: Alias extends Aliases<Api> ? Alias : Aliases<Api>,
  error: unknown,
): error is ZodiosMatchingErrorsByAlias<Api, Alias> {
  return isDefinedError(error, (err) => findEndpointErrorsByAlias(api, alias, err))
}
