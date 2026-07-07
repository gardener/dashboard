//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Identifier-shaped `field:` prefix at the start of a token (after an optional
// leading `-`). Used to split a token into qualifier and value.
const fieldPrefixPattern = /^([A-Za-z_][A-Za-z0-9_]*):/

const CHAR_QUOTE = 34 // "
const CHAR_SPACE = 32
const CHAR_TAB = 9
const CHAR_LF = 10
const CHAR_CR = 13

function isTokenSeparator (code) {
  return code === CHAR_SPACE || code === CHAR_TAB || code === CHAR_LF || code === CHAR_CR
}

function getTermValues (fields, allValues, field) {
  if (field === null) {
    return allValues
  }
  if (!Object.hasOwn(fields, field)) {
    return [undefined]
  }
  return [fields[field]] // eslint-disable-line security/detect-object-injection -- key validated by hasOwn above; fields is an app-constructed object literal, field is constrained to allowedFields
}

// Splits the raw query on whitespace while keeping quoted phrases intact.
// Qualifiers, exclusions, and quote markers stay in the token for `parseSearch`.
export function tokenizeSearch (text) {
  if (typeof text !== 'string' || text.length === 0) {
    return []
  }

  const tokens = []
  const len = text.length
  let start = -1
  let inQuotes = false
  let i = 0

  while (i < len) {
    const code = text.charCodeAt(i)

    if (code === CHAR_QUOTE) {
      if (start === -1) {
        start = i
      }
      if (inQuotes && text.charCodeAt(i + 1) === CHAR_QUOTE) {
        // `""` inside quotes = escaped literal quote; consume both
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i++
      continue
    }

    if (!inQuotes && isTokenSeparator(code)) {
      if (start !== -1) {
        tokens.push(text.slice(start, i))
        start = -1
      }
      i++
      continue
    }

    if (start === -1) {
      start = i
    }
    i++
  }

  if (start !== -1) {
    tokens.push(text.slice(start, len))
  }

  return tokens
}

export class SearchQuery {
  constructor (terms) {
    this.terms = terms
  }

  matches (fields) {
    const allValues = Object.values(fields)
    for (const term of this.terms) {
      const values = getTermValues(fields, allValues, term.field)
      const matchesTermValue = value => {
        if (term.value === '') {
          return value == null || value === ''
        }
        if (value == null || value === '') {
          return false
        }
        const stringValue = typeof value === 'string' ? value : String(value)
        return term.exact ? stringValue === term.value : stringValue.includes(term.value)
      }
      const found = values.some(matchesTermValue)
      if ((!found && !term.exclude) || (found && term.exclude)) {
        return false
      }
    }
    return true
  }
}

// Converts tokens into normalized search terms. Only fields listed in
// `allowedFields` are treated as qualifiers; exclusions and quoted values become
// flags on each term.
export function parseSearch (text, allowedFields = []) {
  const allowed = allowedFields instanceof Set
    ? allowedFields
    : new Set(allowedFields)
  const terms = []
  for (let value of tokenizeSearch(text)) {
    let exclude = false
    if (value[0] === '-') {
      exclude = true
      value = value.substring(1)
    }

    let field = null
    const fieldMatch = fieldPrefixPattern.exec(value)
    if (fieldMatch) {
      const [
        fieldPrefix, // e.g. `seed:`
        fieldName, // e.g. `seed`
      ] = fieldMatch
      if (allowed.has(fieldName)) {
        field = fieldName
        value = value.substring(fieldPrefix.length)
      }
    }

    let exact = false
    const end = value.length - 1
    if (value[0] === '"' && value[end] === '"' && end >= 1) { // eslint-disable-line security/detect-object-injection -- numeric indexing into a string (not object property access); plugin false-positive
      exact = true
      value = value.substring(1, end).replace(/""/g, '"')
    }
    if (value || field !== null) {
      terms.push({
        field,
        value,
        exact,
        exclude,
      })
    }
  }
  return new SearchQuery(terms)
}
