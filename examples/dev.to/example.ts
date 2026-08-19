import { Zodios } from '../../src/index'
import { pluginApiKey } from './api-key-plugin'
import { articlesApi } from './articles'
import { commentsApi } from './comments'
import { followersApi } from './followers'
import { followsApi } from './follows'
import { userApi } from './users'

export const devTo = new Zodios('https://dev.to/api', [
  ...articlesApi,
  ...commentsApi,
  ...followsApi,
  ...followersApi,
  ...userApi,
])

devTo.use(
  pluginApiKey({
    getApiKey: async () => '<your dev.to api key>',
  }),
)

const result = devTo.get('/articles/:id', {
  params: { id: 123 },
})
