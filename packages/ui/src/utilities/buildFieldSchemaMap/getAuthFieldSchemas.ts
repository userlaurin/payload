import type { SanitizedCollectionConfig, TextField } from 'payload'

import { confirmPassword, password } from 'payload/shared'

/** These controls only belong to the admin form, not the persisted collection schema. */
export const getAuthFieldSchemas = ({
  auth,
}: {
  auth: SanitizedCollectionConfig['auth']
}): TextField[] => [
  {
    name: 'password',
    type: 'text',
    admin:
      auth.admin?.components?.PasswordLabel !== undefined
        ? { components: { Label: auth.admin.components.PasswordLabel } }
        : undefined,
    label: ({ t }) => t('authentication:newPassword'),
    required: true,
    validate: password,
  },
  {
    name: 'confirm-password',
    type: 'text',
    admin:
      auth.admin?.components?.ConfirmPasswordLabel !== undefined
        ? { components: { Label: auth.admin.components.ConfirmPasswordLabel } }
        : undefined,
    label: ({ t }) => t('authentication:confirmPassword'),
    required: true,
    validate: confirmPassword,
  },
]
