import type { I18n } from '@payloadcms/translations'
import type { ClientConfig, ClientFieldSchemaMap, Field, FieldSchemaMap, Payload } from 'payload'

import { createClientFields } from 'payload'

import { traverseFields } from './traverseFields.js'

/**
 * Flattens the config fields into a map of field schemas
 */
export const buildClientFieldSchemaMap = (args: {
  collectionSlug?: string
  config: ClientConfig
  globalSlug?: string
  i18n: I18n
  payload: Payload
  schemaMap: FieldSchemaMap
  widgetSlug?: string
}): { clientFieldSchemaMap: ClientFieldSchemaMap } => {
  const { collectionSlug, config, globalSlug, i18n, payload, schemaMap, widgetSlug } = args

  const clientSchemaMap: ClientFieldSchemaMap = new Map()

  if (collectionSlug) {
    const matchedCollection = config.collections.find(
      (collection) => collection.slug === collectionSlug,
    )

    if (matchedCollection) {
      let fieldsToSet = matchedCollection?.fields || []

      if (matchedCollection.auth && !matchedCollection.auth.disableLocalStrategy) {
        const authFields = createClientFields({
          defaultIDType: payload.config.db.defaultIDType,
          fields: [
            schemaMap.get(`${collectionSlug}.password`),
            schemaMap.get(`${collectionSlug}.confirm-password`),
          ] as Field[],
          i18n,
          importMap: payload.importMap,
        })
        // Place these fields _last_ to ensure they do not disrupt field paths in the field schema map
        fieldsToSet = fieldsToSet.concat(authFields)
      }

      clientSchemaMap.set(collectionSlug, {
        fields: fieldsToSet,
      })

      traverseFields({
        clientSchemaMap,
        config,
        fields: fieldsToSet,
        i18n,
        parentIndexPath: '',
        parentSchemaPath: collectionSlug,
        payload,
        schemaMap,
      })
    }
  } else if (globalSlug) {
    const matchedGlobal = config.globals.find((global) => global.slug === globalSlug)

    if (matchedGlobal) {
      clientSchemaMap.set(globalSlug, {
        fields: matchedGlobal.fields,
      })

      traverseFields({
        clientSchemaMap,
        config,
        fields: matchedGlobal.fields,
        i18n,
        parentIndexPath: '',
        parentSchemaPath: globalSlug,
        payload,
        schemaMap,
      })
    }
  } else if (widgetSlug) {
    const matchedWidget = config.admin?.dashboard?.widgets?.find(
      (widget) => widget.slug === widgetSlug,
    )

    if (matchedWidget?.fields?.length) {
      clientSchemaMap.set(widgetSlug, {
        fields: matchedWidget.fields,
      })

      traverseFields({
        clientSchemaMap,
        config,
        fields: matchedWidget.fields,
        i18n,
        parentIndexPath: '',
        parentSchemaPath: widgetSlug,
        payload,
        schemaMap,
      })
    }
  }

  return { clientFieldSchemaMap: clientSchemaMap }
}
