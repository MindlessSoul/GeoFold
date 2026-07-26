// Port of the .NET FormSchemaValidator. Validates a project's form_schema and a survey's
// form_data against it. Supported types: text, number, integer, boolean, date, select.

export interface FormFieldDef {
  key: string
  label?: string
  type: string
  required: boolean
}

const KNOWN_TYPES = new Set(['text', 'string', 'number', 'integer', 'boolean', 'bool', 'date', 'select'])

export function parseSchema(json: string | null | undefined): { fields: FormFieldDef[]; errors: string[] } {
  const errors: string[] = []
  const fields: FormFieldDef[] = []
  if (!json || !json.trim()) return { fields, errors }

  let root: unknown
  try {
    root = JSON.parse(json)
  } catch {
    errors.push('form_schema is not valid JSON.')
    return { fields, errors }
  }
  if (!Array.isArray(root)) {
    errors.push('form_schema must be a JSON array of field definitions.')
    return { fields, errors }
  }

  const seen = new Set<string>()
  root.forEach((item, i) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      errors.push(`form_schema[${i}] must be an object.`)
      return
    }
    const o = item as Record<string, unknown>
    const key = typeof o.key === 'string' ? o.key : null
    const type = typeof o.type === 'string' ? o.type : null
    const label = typeof o.label === 'string' ? o.label : undefined
    const required = o.required === true

    if (!key || !key.trim()) errors.push(`form_schema[${i}] is missing a non-empty "key".`)
    else if (seen.has(key)) errors.push(`form_schema[${i}] has duplicate key "${key}".`)
    else seen.add(key)

    if (!type || !type.trim()) errors.push(`form_schema[${i}] (key "${key}") is missing a "type".`)
    else if (!KNOWN_TYPES.has(type.toLowerCase())) errors.push(`form_schema[${i}] (key "${key}") has unsupported type "${type}".`)

    if (key && type) fields.push({ key, label, type, required })
  })

  return { fields, errors }
}

export function validateFormData(json: string | null | undefined, fields: FormFieldDef[]): string[] {
  const errors: string[] = []
  if (fields.length === 0) return errors

  if (!json || !json.trim()) {
    for (const f of fields) if (f.required) errors.push(`Field "${f.key}" is required.`)
    return errors
  }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    errors.push('form_data is not valid JSON.')
    return errors
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('form_data must be a JSON object.')
    return errors
  }

  const obj = data as Record<string, unknown>
  for (const f of fields) {
    const v = obj[f.key]
    const present = v !== null && v !== undefined
    if (!present) {
      if (f.required) errors.push(`Field "${f.key}" is required.`)
      continue
    }
    if (f.required && typeof v === 'string' && v.trim() === '') {
      errors.push(`Field "${f.key}" is required.`)
      continue
    }
    if (!typeMatches(f.type, v)) errors.push(`Field "${f.key}" must be of type ${f.type}.`)
  }
  return errors
}

function typeMatches(type: string, v: unknown): boolean {
  switch (type.toLowerCase()) {
    case 'text':
    case 'string':
    case 'select':
      return typeof v === 'string'
    case 'number':
      return typeof v === 'number'
    case 'integer':
      return typeof v === 'number' && Number.isInteger(v)
    case 'boolean':
    case 'bool':
      return typeof v === 'boolean'
    case 'date':
      return typeof v === 'string' && !Number.isNaN(Date.parse(v))
    default:
      return true
  }
}
