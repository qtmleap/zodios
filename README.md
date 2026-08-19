 <h1 align="center">Zodios</h1>
 <p align="center">
   <a href="https://github.com/ecyrbe/zodios">
     <img align="center" src="https://raw.githubusercontent.com/ecyrbe/zodios/main/docs/logo.svg" width="128px" alt="Zodios logo">
   </a>
 </p>
 <p align="center">
    Zodios is a typescript api client and an optional api server with auto-completion features backed by the native <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">fetch API</a> and <a href="https://github.com/colinhacks/zod">zod</a> and <a href="https://expressjs.com/">express</a>
    <br/>
    <a href="https://www.zodios.org/">Documentation</a>
 </p>
 
 <p align="center">
   <a href="https://www.npmjs.com/package/@zodios/core">
   <img src="https://img.shields.io/npm/v/@zodios/core.svg" alt="langue typescript">
   </a>
   <a href="https://www.npmjs.com/package/@zodios/core">
   <img alt="npm" src="https://img.shields.io/npm/dw/@zodios/core">
   </a>
   <a href="https://github.com/ecyrbe/zodios/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/ecyrbe/zodios">   
   </a>
   <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/ecyrbe/zodios/ci.yml?branch=main">
 </p>
<p align="center">
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/core?label=%40zodios%2Fcore"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/fetch?label=%40zodios%2Ffetch"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/axios?label=%40zodios%2Faxios"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/react?label=%40zodios%2Freact"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/express?label=%40zodios%2Fexpress"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/openapi?label=%40zodios%2Fopenapi"/>
   <img alt="Bundle Size" src="https://img.shields.io/bundlephobia/minzip/@zodios/testing?label=%40zodios%2Ftesting"/>
</p>

https://user-images.githubusercontent.com/633115/185851987-554f5686-cb78-4096-8ff5-c8d61b645608.mp4

# What is it ?

It's a fetch based API client and an optional expressJS compatible API server with the following features:  
  
- really simple centralized API declaration
- typescript autocompletion in your favorite IDE for URL and parameters
- typescript response types
- parameters and responses schema thanks to zod
- response schema validation
- powerfull plugins like `auth` automatic injection
- zero runtime dependency: backed by the native fetch API (Node >= 20, browsers, workers)
- `@tanstack/query` wrappers for react and solid (vue, svelte, etc, soon)
- all expressJS features available (middlewares, etc.)

  
**Table of contents:**

- [What is it ?](#what-is-it-)
- [Migration from v10 (axios) to v11 (fetch)](#migration-from-v10-axios-to-v11-fetch)
  - [zod v4](#zod-v4)
- [Install](#install)
  - [Client and api definitions :](#client-and-api-definitions-)
  - [Server :](#server-)
- [How to use it on client side ?](#how-to-use-it-on-client-side-)
  - [Declare your API with zodios](#declare-your-api-with-zodios)
  - [API definition format](#api-definition-format)
- [Full documentation](#full-documentation)
- [Ecosystem](#ecosystem)
- [Roadmap](#roadmap)
- [Dependencies](#dependencies)

# Migration from v10 (axios) to v11 (fetch)

Since v11, zodios is backed by the native fetch API and axios is no longer a dependency. Requirements: zod ^4 and Node >= 20 (or any runtime with fetch support).

| v10 (axios) | v11 (fetch) | notes |
|---|---|---|
| `new Zodios(url, api, { axiosInstance })` | `new Zodios(url, api, { fetch })` | inject a custom fetch function instead |
| `new Zodios(url, api, { axiosConfig })` | `new Zodios(url, api, { fetchOptions })` | default `ZodiosFetchOptions` applied to every request |
| `zodios.axios` getter | removed | use `options.fetch` injection for advanced needs |
| request config: `paramsSerializer`, `onUploadProgress`, `auth`, `proxy`, ... | `queriesSerializer` and fetch standard options (`signal`, `cache`, `credentials`, ...) | `timeout` is still supported (implemented with `AbortSignal.timeout`) |
| errors: `AxiosError` | `ZodiosResponseError` | `error.response.status` and `error.response.data` keep the same shape, `isErrorFromPath`/`isErrorFromAlias` are unchanged |
| plugin hooks: `AxiosResponse` | `ZodiosResponse` | `data`/`status`/`statusText` are unchanged, `headers` is now a fetch `Headers` object: use `headers.get(name)` |
| type `ErrorsToAxios` | `ErrorsToResponseErrors` | only relevant if you imported from `@zodios/core/lib/zodios.types` |
| `transform` defaults to `true` | `transform` defaults to `false` | transformation is business code better kept on the backend. Pass `{ transform: true }` to keep the v10 behavior |

## ESM only

v11 is published as an ESM-only package (no CJS build). What it means for you:

- `import` users: nothing changes
- `require()` users: Node >= 20.19 (or >= 22.12) can `require()` ESM modules natively, so `const { Zodios } = require("@zodios/core")` keeps working there. On older runtimes, migrate to `import` or use dynamic `import()`
- bundlers (vite, webpack, esbuild, ...) handle ESM-only dependencies out of the box

## zod v4

v11 also moves the zod peer dependency from `^3.x` to `^4.0.0`. What it means for you:

- your api definition schemas must be written with [zod v4](https://zod.dev/v4/changelog): most schemas work unchanged, but some APIs changed (e.g. `z.record` now requires both a key and a value schema: `z.record(z.string(), z.string())`)
- if you reference zod types in your own helpers, note that the `ZodType` generics changed in v4: use `z.ZodType` instead of `z.ZodType<any, any, any>` / `z.ZodTypeAny`
- the message of the `ZodiosError` thrown on response validation failure is now formatted with `z.prettifyError` (human readable output instead of the raw JSON issue list) - only relevant if you match on error message strings
- validation behavior itself (`validate`, `transform`, `sendDefaults`) is unchanged

# Install

This fork is published on [GitHub Packages](https://github.com/qtmleap/zodios/pkgs/npm/zodios) as `@qtmleap/zodios`. Point the `@qtmleap` scope at the GitHub Packages registry in your `.npmrc` (a `GITHUB_TOKEN` with `read:packages` is required, even for public packages):

```ini
@qtmleap:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
> npm install @qtmleap/zodios
```

or

```bash
> yarn add @qtmleap/zodios
```

# How to use it on client side ?

For an almost complete example on how to use zodios and how to split your APIs declarations, take a look at [dev.to](examples/dev.to/) example.

## Declare your API with zodios

Here is an example of API declaration with Zodios.
  
```typescript
import { Zodios } from "@qtmleap/zodios";
import { z } from "zod";

const apiClient = new Zodios(
  "https://jsonplaceholder.typicode.com",
  // API definition
  [
    {
      method: "get",
      path: "/users/:id", // auto detect :id and ask for it in apiClient get params
      alias: "getUser", // optional alias to call this endpoint with it
      description: "Get a user",
      response: z.object({
        id: z.number(),
        name: z.string(),
      }),
    },
  ],
);
```

Calling this API is now easy and has builtin autocomplete features :  
  
```typescript
//   typed                     auto-complete path   auto-complete params
//     ▼                               ▼                   ▼
const user = await apiClient.get("/users/:id", { params: { id: 7 } });
console.log(user);
```
  
It should output  
  
```js
{ id: 7, name: 'Kurtis Weissnat' }
```
You can also use aliases :
  
```typescript
//   typed                     alias   auto-complete params
//     ▼                        ▼                ▼
const user = await apiClient.getUser({ params: { id: 7 } });
console.log(user);
```
## API definition format

```typescript
type ZodiosEndpointDescriptions = Array<{
  method: 'get'|'post'|'put'|'patch'|'delete';
  path: string; // example: /posts/:postId/comments/:commentId
  alias?: string; // example: getPostComments
  immutable?: boolean; // flag a post request as immutable to allow it to be cached with react-query
  description?: string;
  requestFormat?: 'json'|'form-data'|'form-url'|'binary'|'text'; // default to json if not set
  parameters?: Array<{
    name: string;
    description?: string;
    type: 'Path'|'Query'|'Body'|'Header';
    schema: ZodSchema; // you can use zod `transform` to transform the value of the parameter before sending it to the server
  }>;
  response: ZodSchema; // you can use zod `transform` to transform the value of the response before returning it
  status?: number; // default to 200, you can use this to override the sucess status code of the response (only usefull for openapi and express)
  responseDescription?: string; // optional response description of the endpoint
  errors?: Array<{
    status: number | 'default';
    description?: string;
    schema: ZodSchema; // transformations are not supported on error schemas
  }>;
}>;
```
# Full documentation

Check out the [full documentation](https://www.zodios.org) or following shortcuts.

- [API definition](https://www.zodios.org/docs/category/zodios-api-definition)
- [Http client](https://www.zodios.org/docs/category/zodios-client)
- [React hooks](https://www.zodios.org/docs/client/react)
- [Solid hooks](https://www.zodios.org/docs/client/solid)
- [API server](http://www.zodios.org/docs/category/zodios-server)
- [Nextjs integration](http://www.zodios.org/docs/server/next)

# Ecosystem

- [openapi-zod-client](https://github.com/astahmer/openapi-zod-client): generate a zodios client from an openapi specification
- [@zodios/express](https://github.com/ecyrbe/zodios-express): full end to end type safety like tRPC, but for REST APIs
- [@zodios/plugins](https://github.com/ecyrbe/zodios-plugins) : some plugins for zodios
- [@zodios/react](https://github.com/ecyrbe/zodios-react) : a react-query wrapper for zodios
- [@zodios/solid](https://github.com/ecyrbe/zodios-solid) : a solid-query wrapper for zodios

# Roadmap for v11

- [ ] TypeProvider for `Zod` / `Io-Ts` :

  - By using the TypeProvider pattern we can now make zodios validation agnostic.

  - Implement at least ZodTypeProvider and IoTsTypeProvider since they both support `input` and `output` type inferrence

  - openapi generation will only be compatible with zod though

  - Not a breaking change so no codemod needed

  - **v11 status: out of scope.** The type system is deeply tied to zod (`z.input`/`z.output`) and v11 just committed to zod v4. If revisited, it should target the [Standard Schema](https://standardschema.dev) spec (which zod v4 implements) rather than per-library providers.

- [x] MonoRepo:

  - Zodios will become a really large project so maybe migrate to turbo repo + pnpm

  - not a breaking change

- [x] Transform:

  - ~~By default, activate transforms on backend and disable on frontend (today it's the opposite)~~ Done in v11: the client now defaults to `transform: false`. Pass `{ transform: true }` explicitly to keep the v10 behavior.

  - Rationale being that transformation can be viewed as business code that should be kept on backend

- [x] Axios:

  - Move Axios client to it's own package `@zodios/axios` and keep `@zodios/core` with only common types and helpers

  - Move plugins to `@zodios/axios-plugins`

  - breaking change => easy to do a codemod for this

- [x] Fetch:

  - ~~Create a new Fetch client with almost the same features as axios, but without axios dependency~~ Done in v11: the core client is now backed by the native fetch API and axios has been removed entirely.

- [ ] React/Solid:  

   - make ZodiosHooks independant of Zodios client instance (axios, fetch)

   - not a breaking change, so no codemod needed

   - **v11 status: out of scope.** `ZodiosHooks` lives in the separate `@zodios/react` package, so there is nothing to change in this repository.

- [x] Client Request Config

  - uniform Query/Mutation with body sent on the config and not as a standalone object. This would allow to not do `client.deleteUser(undefined, { params: { id: 1 } })` but simply  `client.deleteUser({ params: { id: 1 } })`

  - breaking change, so a codemod would be needed, but might be difficult to implement

- [x] Mock/Tests:

  - if we implement an abstraction layer for client instance, relying on moxios to mock APIs response will likely not work for fetch implementation.

  - create a `@zodios/testing` package that work for both axios/fetch clients

  - new feature, so no breaking change (no codemod needed)

You have other ideas ? [Let me know !](https://github.com/ecyrbe/zodios/discussions)
# Dependencies

Zodios even when working in pure Javascript is better suited to be working with Typescript Language Server to handle autocompletion.
So you should at least use the one provided by your IDE (vscode integrates a typescript language server)
However, we will only support fixing bugs related to typings for versions of Typescript Language v4.5
Earlier versions should work, but do not have TS tail recusion optimisation that impact the size of the API you can declare.

Also note that Zodios do not embed any dependency. It's your Job to install the peer dependencies you need.  
  
Internally Zodios uses these libraries on all platforms :
- zod
- the native fetch API
