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

export function useEditorLineHighlighter (cmView) {
  cmView.dom.classList.add('g-editor-line-highlighter')

  const highlightableLineNumbers = lineNumbers({
    domEventHandlers: {
      mousedown (cmView, line, event) {
        onGutterClick(cmView, line, event)
      },
    },
  })

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

  const selection = computed({
    get () {
      return valuesFromParams()
    },
    set (values = []) {
      const valuesOld = valuesFromParams()

      let [startLine, endLine = startLine] = values
      const [startLineOld, endLineOld] = valuesOld

      if (endLine === startLine && startLine === startLineOld && !endLineOld) {
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

  const startLine = computed(() => selection.value[0])

  if (startLine.value) {
    const pos = cmView.state.doc.line(startLine.value).from

    cmView.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: 'center' }),
    })
  }

  function onGutterClick (cmView, line, event) {
    const lineNumber = cmView.state.doc.lineAt(line.from).number
    selection.value = startLine.value && startLine.value !== lineNumber && event.shiftKey
      ? [startLine.value, lineNumber]
      : [lineNumber]
  }

  const setHighlightEffect = StateEffect.define()
  const highlightField = StateField.define({
    create () {
      return Decoration.none
    },
    update (highlights, tr) {
      // need to re-add when editor updates
      cmView.dom.classList.add('g-editor-line-highlighter')

      for (const effect of tr.effects) {
        if (effect.is(setHighlightEffect)) {
          return effect.value
        }
      }
      return highlights
    },
    provide: f => EditorView.decorations.from(f),
  })

  function highlightSelection () {
    const { state } = cmView

    const lineCount = state.doc.lines

    const [startLine, endLine = startLine] = selection.value.map(value =>
      Math.max(1, Math.min(value, lineCount)),
    )

    const decorations = []
    for (let line = startLine; line <= endLine; line++) {
      const lineRange = state.doc.line(line)

      decorations.push(
        Decoration.line({ class: 'g-highlighted' }).range(lineRange.from),
      )

      if (line === startLine) {
        decorations.push(
          Decoration.line({ class: 'g-highlighted--top' }).range(lineRange.from),
        )
      }

      if (line === endLine) {
        decorations.push(
          Decoration.line({ class: 'g-highlighted--bottom' }).range(lineRange.from),
        )
      }
    }

    const decorationSet = Decoration.set(decorations)
    cmView.dispatch({
      effects: setHighlightEffect.of(decorationSet),
    })
  }

  // Apply the StateField to the editor's state
  cmView.dispatch({
    effects: [
      StateEffect.appendConfig.of(highlightField),
      StateEffect.appendConfig.of(highlightableLineNumbers),
    ],
  })

  const unwatch = watch(selection, highlightSelection, {
    immediate: true,
  })

  function destroy () {
    unwatch()
  }

  return { destroy }
}
