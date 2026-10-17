import type { Field, SanitizedCollectionConfig, SanitizedConfig } from 'payload'

import { getTranslation, initI18n } from '@payloadcms/translations'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import { createClientConfig } from 'payload'

import { getClientSchemaMap } from '../getClientSchemaMap.js'
import { describe, expect, it, vi } from 'vitest'

import { iterateCollections } from '../../../../payload/src/bin/generateImportMap/iterateCollections.js'
import { buildClientFieldSchemaMap } from '../buildClientFieldSchemaMap/index.js'
import { getAuthFieldSchemas } from './getAuthFieldSchemas.js'
import { buildFieldSchemaMap } from './index.js'

const makeI18n = (language: 'de' | 'en') =>
  initI18n({
    config: { supportedLanguages: { de, en }, fallbackLanguage: 'en' },
    context: 'api',
    language,
  })

const auth = {
  admin: {
    components: {
      PasswordLabel: '/PasswordLabel#PasswordLabel',
      ConfirmPasswordLabel: '/ConfirmLabel#ConfirmLabel',
    },
  },
  disableLocalStrategy: false,
} as SanitizedCollectionConfig['auth']

const collection = { slug: 'users', auth, fields: [] } as SanitizedCollectionConfig
const config = {
  admin: { components: {} },
  blocks: [],
  collections: [collection],
  db: { defaultIDType: 'number' },
  globals: [],
} as unknown as SanitizedConfig

// The real client serializer only needs these mapped component functions for label registration.
const importMap = {
  '/PasswordLabel#PasswordLabel': () => null,
  '/ConfirmLabel#ConfirmLabel': () => null,
}

const payload = { config, importMap } as import('payload').Payload

describe('auth label field schemas', () => {
  it('should register virtual labels through the normal field schema and import map', async () => {
    const i18n = await makeI18n('en')
    const { fieldSchemaMap } = buildFieldSchemaMap({ collectionSlug: 'users', config, i18n })
    const clientConfig = createClientConfig({
      config,
      i18n,
      importMap,
      user: { collection: 'users' } as never,
    })
    const { clientFieldSchemaMap } = buildClientFieldSchemaMap({
      collectionSlug: 'users',
      config: clientConfig,
      i18n,
      payload,
      schemaMap: fieldSchemaMap,
    })
    const serverPassword = fieldSchemaMap.get('users.password') as Field
    expect(serverPassword.admin?.components?.Label).toBe(auth.admin?.components?.PasswordLabel)
    expect(clientFieldSchemaMap.get('users.password')).toMatchObject({
      name: 'password',
      required: true,
      label: i18n.t('authentication:newPassword'),
    })
    const addToImportMap = vi.fn()
    iterateCollections({
      addToImportMap,
      baseDir: '',
      collections: [collection],
      config,
      importMap: {},
      imports: {},
    })
    expect(addToImportMap).toHaveBeenCalledWith(auth.admin?.components?.PasswordLabel)
    expect(addToImportMap).toHaveBeenCalledWith(auth.admin?.components?.ConfirmPasswordLabel)
    expect(collection.fields).toEqual([])
  })

  it('should keep schema labels isolated between languages and collections', async () => {
    const english = getAuthFieldSchemas({ auth })
    const german = getAuthFieldSchemas({ auth: {} as typeof auth })
    expect(getTranslation(english[0].label, await makeI18n('en'))).not.toBe(
      getTranslation(german[0].label, await makeI18n('de')),
    )
    expect(german[0].admin).toBeUndefined()
    expect(english[0].admin?.components?.Label).toBe(auth.admin?.components?.PasswordLabel)
  })

  it('should preserve an explicitly hidden custom label', async () => {
    const fields = getAuthFieldSchemas({
      auth: {
        admin: { components: { PasswordLabel: false, ConfirmPasswordLabel: false } },
      } as typeof auth,
    })
    expect(fields.map((field) => field.admin?.components?.Label)).toEqual([false, false])
  })

  it('should keep virtual controls absent for a disabled local strategy', async () => {
    const disabled = {
      ...collection,
      auth: { ...auth, disableLocalStrategy: true },
    } as SanitizedCollectionConfig
    const { fieldSchemaMap } = buildFieldSchemaMap({
      collectionSlug: 'users',
      config: { ...config, collections: [disabled] },
    })
    expect(fieldSchemaMap.has('users.password')).toBe(false)
    expect(fieldSchemaMap.has('users.confirm-password')).toBe(false)
  })
  it('should refresh cached client labels when the admin language changes', async () => {
    const englishI18n = await makeI18n('en')
    const germanI18n = await makeI18n('de')
    const { fieldSchemaMap } = buildFieldSchemaMap({
      collectionSlug: 'users',
      config,
      i18n: englishI18n,
    })
    global._payload_doNotCacheClientSchemaMap = true
    const english = getClientSchemaMap({
      collectionSlug: 'users',
      config: createClientConfig({ config, i18n: englishI18n, importMap }),
      i18n: englishI18n,
      payload,
      schemaMap: fieldSchemaMap,
    })
    const german = getClientSchemaMap({
      collectionSlug: 'users',
      config: createClientConfig({ config, i18n: germanI18n, importMap }),
      i18n: germanI18n,
      payload,
      schemaMap: fieldSchemaMap,
    })
    expect(german.get('users.confirm-password')).toMatchObject({
      label: germanI18n.t('authentication:confirmPassword'),
    })
    expect(english.get('users.confirm-password')).toMatchObject({
      label: englishI18n.t('authentication:confirmPassword'),
    })
  })
})
