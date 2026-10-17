'use client'

import type { TextFieldLabelClientComponent } from 'payload'

import { FieldLabel } from '@payloadcms/ui'
import React from 'react'

export const CustomFieldLabel: TextFieldLabelClientComponent = ({ field, path }) => (
  <div data-testid={`custom-label-${path}`}>
    <FieldLabel
      htmlFor={`field-${path.replace(/\./g, '__')}`}
      label={field.label}
      localized={field.localized}
      required={field.required}
    />
    <span>Custom field guidance</span>
  </div>
)
