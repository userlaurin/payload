import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fileURLToPath } from 'node:url'
import path from 'path'

import { buildConfigWithDefaults } from '../buildConfigWithDefaults.js'
import { devUser } from '../credentials.js'
import { MediaCollection } from './collections/Media/index.js'
import { PostsCollection, postsSlug } from './collections/Posts/index.js'
import { MenuGlobal } from './globals/Menu/index.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfigWithDefaults({
  // ...extend config here
  admin: {
    components: {
      views: {
        FocusIndicatorsView: {
          Component: '/components/FocusIndicatorsView.js#FocusIndicatorsView',
          path: '/focus-indicators',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: 'users',
      auth: {
        admin: {
          components: {
            ConfirmPasswordLabel: '/components/CustomFieldLabel/index.js#CustomFieldLabel',
            PasswordLabel: '/components/CustomFieldLabelServer/index.js#CustomFieldLabelServer',
          },
        },
        loginWithUsername: { allowEmailLogin: true, requireUsername: false },
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          admin: {
            components: {
              Label: '/components/CustomFieldLabelServer/index.js#CustomFieldLabelServer',
            },
          },
        },
        {
          name: 'username',
          type: 'text',
          admin: {
            components: { Label: '/components/CustomFieldLabel/index.js#CustomFieldLabel' },
          },
        },
      ],
    },
    PostsCollection,
    MediaCollection,
  ],
  editor: lexicalEditor({}),
  globals: [
    // ...add more globals here
    MenuGlobal,
  ],
  onInit: async (payload) => {
    const users = await payload.count({ collection: 'users' })
    if (users.totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: devUser.email,
          password: devUser.password,
        },
      })
    }

    const posts = await payload.count({ collection: postsSlug })
    if (posts.totalDocs === 0) {
      await payload.create({
        collection: postsSlug,
        data: {
          title: 'example post',
        },
      })
    }
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
