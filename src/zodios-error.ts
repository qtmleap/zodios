import type { ReadonlyDeep } from './utils.types'
import type { AnyZodiosRequestOptions, ZodiosResponse } from './zodios.types'

/**
 * Custom Zodios Error with additional information
 * @param message - the error message
 * @param data - the parameter or response object that caused the error
 * @param config - the config object from zodios
 * @param cause - the error cause
 */
export class ZodiosError extends Error {
  constructor(
    message: string,
    public readonly config?: ReadonlyDeep<AnyZodiosRequestOptions>,
    public readonly data?: unknown,
    public readonly cause?: Error,
  ) {
    super(message)
  }
}

/**
 * Error thrown when the server responds with a non 2xx status code
 * @param message - the error message
 * @param config - the config object from zodios, `config.url` contains the url with path params already replaced
 * @param response - the response object with `status` and `data` of the failed request
 */
export class ZodiosResponseError<Data = unknown> extends Error {
  override readonly name: string = 'ZodiosResponseError'

  constructor(
    message: string,
    public readonly config: ReadonlyDeep<AnyZodiosRequestOptions>,
    public readonly response: ZodiosResponse<Data>,
  ) {
    super(message)
  }
}
