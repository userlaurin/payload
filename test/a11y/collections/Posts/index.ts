import type { CollectionConfig, TextField } from 'payload'

import { slugField } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    enableListViewSelectAPI: true,
    useAsTitle: 'title',
  },
  fields: [
    slugField({ position: undefined, required: false }),
    ...[
      ['customSlug', '/components/CustomFieldLabel/index.js#CustomFieldLabel'],
      ['serverSlug', '/components/CustomFieldLabelServer/index.js#CustomFieldLabelServer'],
      ['hiddenSlug', false],
    ].map(([name, Label]) =>
      slugField({
        name: name as string,
        checkboxName: `generate-${name}`,
        overrides: (row) => {
          const slug = row.fields[1] as TextField
          slug.label = { de: `${name} Beschriftung`, en: `${name} label` }
          slug.admin = { ...slug.admin, components: { ...slug.admin?.components, Label } }
          return row
        },
        position: undefined,
        required: false,
      }),
    ),
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        description:
          'A subtitle field to test focus indicators in the admin UI, helps us detect exiting out of rich text editor properly.',
      },
    },
  ],
}
