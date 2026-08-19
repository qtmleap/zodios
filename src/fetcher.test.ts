import { buildURL, fetchRequest, serializeQueries } from './fetcher'
import { ZodiosResponseError } from './zodios-error'

describe('serializeQueries', () => {
  it('should serialize simple queries', () => {
    expect(serializeQueries({ id: 1, name: 'test' })).toBe('id=1&name=test')
  })

  it('should serialize arrays with the repeat format', () => {
    expect(serializeQueries({ id: [1, 2] })).toBe('id=1&id=2')
  })

  it('should skip undefined values', () => {
    expect(serializeQueries({ id: undefined, name: 'test' })).toBe('name=test')
  })
})

describe('buildURL', () => {
  it('should combine baseURL and path', () => {
    expect(buildURL('http://localhost', '/users', '')).toBe('http://localhost/users')
  })

  it('should normalize trailing and leading slashes', () => {
    expect(buildURL('http://localhost/api/', '/users', '')).toBe('http://localhost/api/users')
  })

  it('should ignore baseURL for absolute urls', () => {
    expect(buildURL('http://localhost', 'https://example.com/users', '')).toBe(
      'https://example.com/users',
    )
  })

  it('should append the query string', () => {
    expect(buildURL('http://localhost', '/users', 'id=1')).toBe('http://localhost/users?id=1')
  })

  it('should append to an existing query string', () => {
    expect(buildURL(undefined, '/users?sort=asc', 'id=1')).toBe('/users?sort=asc&id=1')
  })
})

describe('fetchRequest', () => {
  const jsonResponse = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
      ...init,
    })

  it('should parse json responses from content-type', async () => {
    const response = await fetchRequest(
      { method: 'get', url: '/users' },
      { fetch: async () => jsonResponse({ id: 1 }) },
    )
    expect(response.data).toEqual({ id: 1 })
    expect(response.status).toBe(200)
  })

  it('should return undefined data on 204 responses', async () => {
    const response = await fetchRequest(
      { method: 'delete', url: '/users/1' },
      { fetch: async () => new Response(null, { status: 204 }) },
    )
    expect(response.data).toBeUndefined()
  })

  it('should fallback to text when content-type is not json', async () => {
    const response = await fetchRequest(
      { method: 'get', url: '/text' },
      { fetch: async () => new Response('hello', { headers: { 'content-type': 'text/plain' } }) },
    )
    expect(response.data).toBe('hello')
  })

  it.each(['json', 'text', 'blob', 'arrayBuffer', 'stream'] as const)(
    'should honor responseType %s',
    async (responseType) => {
      const response = await fetchRequest(
        { method: 'get', url: '/data', responseType },
        { fetch: async () => jsonResponse({ ok: true }) },
      )
      switch (responseType) {
        case 'json':
          expect(response.data).toEqual({ ok: true })
          break
        case 'text':
          expect(response.data).toBe('{"ok":true}')
          break
        case 'blob':
          expect(response.data).toBeInstanceOf(Blob)
          break
        case 'arrayBuffer':
          expect(response.data).toBeInstanceOf(ArrayBuffer)
          break
        case 'stream':
          expect(response.data).toBeInstanceOf(ReadableStream)
          break
      }
    },
  )

  it('should throw a ZodiosResponseError on non 2xx status', async () => {
    let error: unknown
    try {
      await fetchRequest(
        { method: 'get', url: '/users/1' },
        {
          fetch: async () =>
            jsonResponse({ message: 'not found' }, { status: 404, statusText: 'Not Found' }),
        },
      )
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ZodiosResponseError)
    const responseError = error as ZodiosResponseError
    expect(responseError.response.status).toBe(404)
    expect(responseError.response.data).toEqual({ message: 'not found' })
    expect(responseError.config.url).toBe('/users/1')
    expect(responseError.message).toBe(
      'Zodios: request failed with status 404 Not Found on get /users/1',
    )
  })

  it('should abort the request on timeout', async () => {
    await expect(
      fetchRequest(
        { method: 'get', url: '/slow', timeout: 20 },
        {
          fetch: (_, init) =>
            new Promise((resolve, reject) => {
              init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
              setTimeout(() => resolve(jsonResponse({})), 1000)
            }),
        },
      ),
    ).rejects.toThrowError(/timed?[ -]?out/i)
  })

  it('should abort the request with an abort signal', async () => {
    const controller = new AbortController()
    const pending = fetchRequest(
      { method: 'get', url: '/slow', signal: controller.signal, timeout: 10_000 },
      {
        fetch: (_, init) =>
          new Promise((resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
            setTimeout(() => resolve(jsonResponse({})), 1000)
          }),
      },
    )
    controller.abort(new Error('user aborted'))
    await expect(pending).rejects.toThrowError('user aborted')
  })

  it('should serialize a json body and set the content-type', async () => {
    let received: RequestInit | undefined
    await fetchRequest(
      { method: 'post', url: '/users', data: { name: 'test' } },
      {
        fetch: async (_, init) => {
          received = init
          return jsonResponse({})
        },
      },
    )
    expect(received?.body).toBe('{"name":"test"}')
    expect(new Headers(received?.headers).get('content-type')).toBe('application/json')
  })

  it('should pass native bodies through untouched', async () => {
    const formData = new FormData()
    formData.append('name', 'test')
    let received: RequestInit | undefined
    await fetchRequest(
      { method: 'post', url: '/users', data: formData },
      {
        fetch: async (_, init) => {
          received = init
          return jsonResponse({})
        },
      },
    )
    expect(received?.body).toBe(formData)
    expect(new Headers(received?.headers).has('content-type')).toBe(false)
  })

  it('should merge default and request headers', async () => {
    let received: RequestInit | undefined
    await fetchRequest(
      { method: 'get', url: '/users', headers: { 'x-request': 'a' } },
      {
        defaults: { headers: { 'x-default': 'b', 'x-request': 'overriden' } },
        fetch: async (_, init) => {
          received = init
          return jsonResponse({})
        },
      },
    )
    const headers = new Headers(received?.headers)
    expect(headers.get('x-request')).toBe('a')
    expect(headers.get('x-default')).toBe('b')
  })

  it('should use a custom queries serializer', async () => {
    let requestedUrl: string | undefined
    await fetchRequest(
      {
        method: 'get',
        url: '/users',
        queries: { id: [1, 2] },
        queriesSerializer: (queries) => `ids=${(queries.id as number[]).join(',')}`,
      },
      {
        fetch: async (url) => {
          requestedUrl = String(url)
          return jsonResponse({})
        },
      },
    )
    expect(requestedUrl).toBe('/users?ids=1,2')
  })
})
