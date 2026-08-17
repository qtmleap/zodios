import type { ReadonlyDeep } from './utils.types'
import type {
  AnyZodiosRequestOptions,
  FetchProvider,
  ZodiosFetchOptions,
  ZodiosResponse,
} from './zodios.types'
import { ZodiosResponseError } from './zodios-error'

export type FetcherOptions = {
  baseURL?: string
  fetch?: FetchProvider
  defaults?: ZodiosFetchOptions
}

/**
 * serialize queries to a query string using the repeat format for arrays: `id=1&id=2`
 */
export function serializeQueries(queries: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(queries)) {
    if (value === undefined) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }
  return search.toString()
}

/**
 * combine baseURL and path the same way axios does
 * an absolute path (http(s)://...) ignores the baseURL
 */
export function buildURL(baseURL: string | undefined, path: string, queryString: string): string {
  const isAbsolute = /^https?:\/\//i.test(path)
  const url =
    isAbsolute || !baseURL ? path : `${baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
  if (!queryString) {
    return url
  }
  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
}

function isNativeBody(data: unknown): data is BodyInit {
  return (
    typeof data === 'string' ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof ReadableStream
  )
}

/**
 * resolve the request body
 * native fetch bodies are passed through untouched so fetch can set
 * the correct content-type (with boundary for FormData)
 * everything else is serialized as json
 */
function resolveBody(data: unknown, headers: Headers): BodyInit | undefined {
  if (data === undefined || data === null) {
    return undefined
  }
  if (isNativeBody(data)) {
    return data
  }
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return JSON.stringify(data)
}

async function parseResponseData(
  response: Response,
  responseType?: ZodiosFetchOptions['responseType'],
): Promise<unknown> {
  switch (responseType) {
    case 'json':
      return response.json()
    case 'text':
      return response.text()
    case 'blob':
      return response.blob()
    case 'arrayBuffer':
      return response.arrayBuffer()
    case 'stream':
      return response.body
    default: {
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined
      }
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('json')) {
        return response.json()
      }
      return response.text()
    }
  }
}

function mergeHeaders(
  defaults: ZodiosFetchOptions | undefined,
  config: ReadonlyDeep<AnyZodiosRequestOptions>,
): Headers {
  const headers = new Headers(defaults?.headers)
  for (const [name, value] of Object.entries(config.headers ?? {})) {
    headers.set(name, String(value))
  }
  return headers
}

function resolveSignal(
  defaults: ZodiosFetchOptions | undefined,
  config: ReadonlyDeep<AnyZodiosRequestOptions>,
): AbortSignal | undefined {
  const timeout = config.timeout ?? defaults?.timeout
  const signals = [
    config.signal ?? defaults?.signal,
    timeout === undefined ? undefined : AbortSignal.timeout(timeout),
  ].filter((signal): signal is AbortSignal => signal !== undefined)
  if (signals.length === 0) {
    return undefined
  }
  return signals.length === 1 ? signals[0] : AbortSignal.any(signals)
}

/**
 * make an http request with fetch, mimicking the axios behaviors zodios relies on:
 * query serialization, baseURL resolution, json handling and throwing on non 2xx status
 * @param config - the request config, `config.url` must have path params already replaced
 * @param options - fetcher options: baseURL, custom fetch implementation and default fetch options
 * @returns the response with parsed data
 * @throws {ZodiosResponseError} when the response status is not in the 2xx range
 */
export async function fetchRequest(
  config: ReadonlyDeep<AnyZodiosRequestOptions>,
  options: FetcherOptions = {},
): Promise<ZodiosResponse> {
  const { defaults } = options
  const serialize = config.queriesSerializer ?? defaults?.queriesSerializer ?? serializeQueries
  const queryString = config.queries ? serialize(config.queries) : ''
  const url = buildURL(config.baseURL ?? options.baseURL, config.url, queryString)
  const headers = mergeHeaders(defaults, config)
  const body = resolveBody(config.data, headers)
  const doFetch = options.fetch ?? globalThis.fetch
  const response = await doFetch(url, {
    method: config.method.toUpperCase(),
    headers,
    body,
    signal: resolveSignal(defaults, config),
    cache: config.cache ?? defaults?.cache,
    credentials: config.credentials ?? defaults?.credentials,
    keepalive: config.keepalive ?? defaults?.keepalive,
    mode: config.mode ?? defaults?.mode,
    redirect: config.redirect ?? defaults?.redirect,
    referrer: config.referrer ?? defaults?.referrer,
    referrerPolicy: config.referrerPolicy ?? defaults?.referrerPolicy,
    integrity: config.integrity ?? defaults?.integrity,
    priority: config.priority ?? defaults?.priority,
  })
  const data = await parseResponseData(response, config.responseType ?? defaults?.responseType)
  const zodiosResponse: ZodiosResponse = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data,
    raw: response,
  }
  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    throw new ZodiosResponseError(
      `Zodios: request failed with status ${response.status}${statusText} on ${config.method} ${config.url}`,
      config,
      zodiosResponse,
    )
  }
  return zodiosResponse
}
