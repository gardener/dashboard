//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  MatchDecorator,
  Decoration,
  ViewPlugin,
} from '@codemirror/view'

export function useEditorWhitespace () {
  const matchDecorator = new MatchDecorator({
    regexp: /[ \t]/g,
    decoration (match) {
      if (match[0] === '\t') {
        return Decoration.mark({
          attributes: { class: 'g-cm-highlightedTab' },
        })
      }
      if (match[0] === ' ') {
        return Decoration.mark({
          attributes: { class: 'g-cm-highlightedSpace' },
        })
      }
    },
  })

  const showAllWhitespace = ViewPlugin.define(
    view => ({
      decorations: matchDecorator.createDeco(view),
      update (update) {
        this.decorations = matchDecorator.updateDeco(update, this.decorations)
      },
    }),
    {
      decorations (view) {
        return view.decorations
      },
    },
  )

  return { showAllWhitespace }
}
