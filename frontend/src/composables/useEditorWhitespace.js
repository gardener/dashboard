//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  MatchDecorator,
  Decoration,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view'

export function useEditorWhitespace () {
  // Match leading spaces or tabs (modify the regexp as necessary for tabs or spaces)
  const matchDecorator = new MatchDecorator({
    regexp: /[ \t]/g, // Match each individual space or tab character
    decoration: match => {
      if (match[0] === '\t') {
        return Decoration.mark({
          attributes: { class: 'g-cm-highlightedTab' },
        })
      } else if (match[0] === ' ') {
        return Decoration.mark({
          attributes: { class: 'g-cm-highlightedSpace' },
        })
      }
    },
  })

  class NewlineWidget extends WidgetType {
    toDOM () {
      const span = document.createElement('span')
      span.textContent = '↵'
      span.className = 'g-cm-newline-marker'
      return span
    }
  }

  // Create decorations for newlines at the end of each line
  function addNewlineMarkers (view) {
    const widgets = []
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = view.state.doc.lineAt(pos)
        // Only add a marker if not the last line (as there is no newline after the last line)
        if (line.to < view.state.doc.length) {
          widgets.push(Decoration.widget({
            widget: new NewlineWidget(),
            side: 1, // Ensure the widget is placed after the line text
          }).range(line.to))
        }
        pos = line.to + 1
      }
    }
    return Decoration.set(widgets, true)
  }

  // Define the view plugin for showing the whitespace
  const showAllWhitespace = ViewPlugin.define(
    view => ({
      decorations: matchDecorator.createDeco(view),
      newlineDecorations: Decoration.none,
      update (update) {
        // Update the whitespace and newline decorations together
        this.decorations = matchDecorator.updateDeco(update, this.decorations)
        this.newlineDecorations = addNewlineMarkers(view)
      },
    }),
    {
      decorations (view) {
        const decorations = []
        let iter = view.decorations.iter()
        while (iter.value) {
          decorations.push(iter.value.range(iter.from, iter.to))
          iter.next()
        }
        iter = view.newlineDecorations.iter()
        while (iter.value) {
          decorations.push(iter.value.range(iter.from, iter.to))
          iter.next()
        }
        return Decoration.set(decorations, true)
      },
    },
  )

  return { showAllWhitespace }
}
