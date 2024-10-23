//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
export function parseWarningHeader (headerValue) {
  if (headerValue.length > 10000) {
    // circuit-breaker
    return
  }
  const warningValues = splitWarningValues(headerValue)
  const warnings = []
  for (const warningValue of warningValues) {
    const warning = parseWarningValue(warningValue)
    if (warning) {
      warnings.push(warning)
    }
  }
  return warnings
}

function splitWarningValues (headerValue) {
  const values = []
  let current = ''
  let inQuotes = false
  let escapeNext = false
  for (const char of headerValue) {
    if (escapeNext) {
      current += char
      escapeNext = false
    } else if (char === '\\') {
      current += char
      escapeNext = true
    } else if (char === '"') {
      current += char
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim() !== '') {
    values.push(current.trim())
  }
  return values
}

function parseWarningValue (warningValue) {
  // Split the warningValue into tokens, considering quoted strings
  const tokens = tokenizeWarningValue(warningValue)
  if (!tokens || tokens.length < 3) {
    return null // Invalid warning-value
  }

  const [code, agent, ...rest] = tokens

  // The text is the first quoted string after code and agent
  const textIndex = rest.findIndex(token => token.startsWith('"'))
  if (textIndex === -1) {
    return null // Missing text
  }
  const text = rest[textIndex] // eslint-disable-line security/detect-object-injection -- index of token in string
  const date = rest.slice(textIndex + 1).join(' ') // Remaining tokens may form the date

  // Unquote and unescape the text and date
  const unquotedText = unescapeQuotedString(stripQuotes(text))
  const unquotedDate = date ? unescapeQuotedString(stripQuotes(date)) : null

  return {
    code,
    agent,
    text: unquotedText,
    date: unquotedDate || null,
  }
}

function tokenizeWarningValue (warningValue) {
  const tokens = []
  let current = ''
  let inQuotes = false
  let escapeNext = false
  for (const char of warningValue) {
    if (escapeNext) {
      current += char
      escapeNext = false
    } else if (char === '\\') {
      current += char
      escapeNext = true
    } else if (char === '"') {
      current += char
      inQuotes = !inQuotes
    } else if (/\s/.test(char) && !inQuotes) {
      if (current !== '') {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current !== '') {
    tokens.push(current)
  }
  return tokens
}

function stripQuotes (str) {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1)
  }
  return str
}

function unescapeQuotedString (str) {
  return str.replace(/\\(.)/g, '$1')
}
