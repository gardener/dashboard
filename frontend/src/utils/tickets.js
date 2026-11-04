//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

const MARKDOWN_SPECIAL_CHARACTERS = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')

function escapeMarkdown (value) {
  const escapedCharacters = []
  let previousCharacterWasLineBreak = false
  for (const character of String(value ?? '')) {
    if (character === '\r' || character === '\n') {
      if (!previousCharacterWasLineBreak) {
        escapedCharacters.push(' ')
      }
      previousCharacterWasLineBreak = true
      continue
    }

    previousCharacterWasLineBreak = false
    if (MARKDOWN_SPECIAL_CHARACTERS.has(character)) {
      escapedCharacters.push('\\')
    }
    escapedCharacters.push(character)
  }
  return escapedCharacters.join('')
}

export function formatAccessRestrictions (accessRestrictions = []) {
  if (!accessRestrictions.length) {
    return ''
  }

  const lines = ['## Attention: This cluster has access restrictions']
  for (const accessRestriction of accessRestrictions) {
    lines.push(`  - ${escapeMarkdown(accessRestriction.title)}`)
    for (const option of accessRestriction.options ?? []) {
      lines.push(`    - ${escapeMarkdown(option.title)}`)
    }
  }
  return `${lines.join('\n')}\n`
}
