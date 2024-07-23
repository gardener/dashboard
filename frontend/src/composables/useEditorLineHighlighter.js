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

export function useEditorLineHighlighter (cm) {
  const params = useUrlSearchParams('hash-params')

  const selection = computed({
    get () {
      const line = params.line ?? ''
      const values = line.split('-')
        .map(value => parseInt(value, 10) - 1)
        .sort((a, b) => a - b)
      return values.every(Number.isInteger)
        ? values
        : []
    },
    set (values = []) {
      const [startLine, endLine = startLine] = values
      if (!values.length || !values.every(Number.isInteger)) {
        params.line = null
      } else if (startLine === endLine) {
        params.line = `${startLine + 1}`
      } else if (startLine > endLine) {
        params.line = `${endLine + 1}-${startLine + 1}`
      } else {
        params.line = `${startLine + 1}-${endLine + 1}`
      }
    },
  })

  const startLine = computed(() => selection.value[0])

  if (startLine.value) {
    cm.scrollIntoView({ line: startLine.value, ch: 0 })
    cm.setCursor({ line: startLine.value, ch: 0 })
  }

  function highlightSelection () {
    const lineCount = cm.lineCount()
    for (let line = 0; line < lineCount; line++) {
      cm.removeLineClass(line, 'background', 'g-highlighted')
      cm.removeLineClass(line, 'background', 'g-highlighted--top')
      cm.removeLineClass(line, 'background', 'g-highlighted--bottom')
    }

    // ensure startLine and endLine are within the valid range
    const [
      startLine,
      endLine = startLine,
    ] = selection.value.map(value => Math.max(0, Math.min(value, lineCount - 1)))

    for (let line = startLine; line < endLine + 1; line++) {
      cm.addLineClass(line, 'background', 'g-highlighted')
      if (line === startLine) {
        cm.addLineClass(line, 'background', 'g-highlighted--top')
      }
      if (line === endLine) {
        cm.addLineClass(line, 'background', 'g-highlighted--bottom')
      }
    }
  }

  const unwatch = watch(selection, highlightSelection, {
    immediate: true,
  })

  function onGutterClick (cm, line, gutter, event) {
    selection.value = startLine.value && startLine.value !== line && event.shiftKey
      ? [startLine.value, line]
      : [line]
  }

  function onKeydown (cm, event) {
    if (event.key === 'Escape') {
      selection.value = []
    }
  }

  cm.on('gutterClick', onGutterClick)
  cm.on('change', highlightSelection)
  cm.on('keydown', onKeydown)

  function destroy () {
    unwatch()
    cm.off('gutterClick', onGutterClick)
    cm.off('change', highlightSelection)
    cm.off('keydown', onKeydown)
  }

  return {
    destroy,
  }
}
