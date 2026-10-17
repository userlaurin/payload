import type { TextFieldLabelServerComponent } from 'payload'

import React from 'react'

import { CustomFieldLabel } from '../CustomFieldLabel/index.js'

export const CustomFieldLabelServer: TextFieldLabelServerComponent = ({
  clientField,
  path,
  req,
}) => (
  <div data-language={req.i18n.language} data-testid={`server-label-${path}`}>
    <CustomFieldLabel field={clientField} path={path} schemaPath={path} />
  </div>
)
