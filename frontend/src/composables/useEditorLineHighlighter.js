//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  watch,
} from 'vue'
import { useUrlSearchParams } from '@vueuse/core'
import {
  EditorView,
  lineNumbers,
  Decoration,
} from '@codemirror/view'
import {
  StateEffect,
  EditorSelection,
  StateField,
} from '@codemirror/state'

function useSelection () {
  const params = useUrlSearchParams('hash-params')

  const valuesFromParams = () => {
    const line = params.line ?? ''
    const values = line.split('-')
      .map(value => parseInt(value, 10))
      .sort((a, b) => a - b)
    return values.every(Number.isInteger)
      ? values
      : []
  }

  return computed({
    get () {
      return valuesFromParams()
    },
    set (values = []) {
      const valuesCurrent = valuesFromParams()

      let [startLine, endLine = startLine] = values
      const [startLineCurrent, endLineCurrent] = valuesCurrent

      if (endLine === startLine && startLine === startLineCurrent && !endLineCurrent) {
        startLine = null
      }

      if (!startLine || !values.every(Number.isInteger)) {
        params.line = null
      } else if (startLine === endLine) {
        params.line = `${startLine}`
      } else if (startLine > endLine) {
        params.line = `${endLine}-${startLine}`
      } else {
        params.line = `${startLine}-${endLine}`
      }
    },
  })
}

export function useEditorLineHighlighter (cmView) {
  cmView.dom.classList.add('g-cm-line-highlighter')

  const selection = useSelection()
  const [startLine] = selection.value

  if (startLine) {
    const pos = cmView.state.doc.line(startLine).from
    cmView.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: 'center' }),
    })
  }

  const stateEffectType = StateEffect.define()
  const stateField = StateField.define({
    create () {
      return Decoration.none
    },
    update (highlights, tr) {
      // need to re-add when editor updates
      cmView.dom.classList.add('g-cm-line-highlighter')

      for (const effect of tr.effects) {
        if (effect.is(stateEffectType)) {
          return effect.value
        }
      }
      return highlights
    },
    provide (f) {
      return EditorView.decorations.from(f)
    },
  })

  const lineNumberGutterExtension = lineNumbers({
    domEventHandlers: {
      mousedown (cmView, line, event) {
        const lineNumber = cmView.state.doc.lineAt(line.from).number
        const [startLine] = selection.value
        selection.value = startLine && startLine !== lineNumber && event.shiftKey
          ? [startLine, lineNumber]
          : [lineNumber]
      },
    },
  })

  // Apply the StateField to the editor's state
  cmView.dispatch({
    effects: [
      StateEffect.appendConfig.of(stateField),
      StateEffect.appendConfig.of(lineNumberGutterExtension),
    ],
  })

  const destroy = watch(selection, value => {
    const lineCount = cmView.state.doc.lines
    const [
      startLine,
      endLine = startLine,
    ] = value.map(value => {
      value = Math.min(value, lineCount)
      value = Math.max(1, value)
      return cmView.state.doc.line(value).from
    })

    const decorations = []
    if (startLine && endLine) {
      decorations.push(Decoration.line({ class: 'g-highlighted--top' }).range(startLine))
      for (let line = startLine; line <= endLine; line++) {
        decorations.push(Decoration.line({ class: 'g-highlighted' }).range(line))
      }
      decorations.push(Decoration.line({ class: 'g-highlighted--bottom' }).range(endLine))
    }
    cmView.dispatch({
      effects: stateEffectType.of(Decoration.set(decorations)),
    })
  }, {
    immediate: true,
  })

  return { destroy }
}
