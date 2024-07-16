//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  ref,
} from 'vue'
import { useUrlSearchParams } from '@vueuse/core'

export function useEditorLineHighlighter (cm) {
  const params = useUrlSearchParams('hash-params')

  const startLine = ref(null)

  const selectionBoundary = computed(() => {
    const lineParam = params.line || ''

    let [startLine, endLine] = lineParam.split('-').map(num => (num ? parseInt(num, 10) - 1 : null))

    if (!Number.isInteger(startLine) && !Number.isInteger(endLine)) {
      return { startLine: null, endLine: null }
    }

    if (!Number.isInteger(startLine)) {
      startLine = endLine
    }
    if (!Number.isInteger(endLine)) {
      endLine = startLine
    }

    return { startLine, endLine }
  })

  // initialize startLine with the value from the URL
  startLine.value = selectionBoundary.value.startLine

  function setSelectionBoundary ({ startLine, endLine }) {
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      params.line = null
      return
    }

    if (startLine > endLine) {
      [startLine, endLine] = [endLine, startLine]
    }

    if (startLine === endLine) {
      params.line = `${startLine + 1}`
    } else {
      params.line = `${startLine + 1}-${endLine + 1}`
    }
  }

  function clearHighlightedLines () {
    const lineCount = cm.lineCount()
    for (let line = 0; line < lineCount; line++) {
      cm.removeLineClass(line, 'background', 'g-highlighted-top')
      cm.removeLineClass(line, 'background', 'g-highlighted-middle')
      cm.removeLineClass(line, 'background', 'g-highlighted-bottom')
    }
  }

  function highlightBoundary ({ startLine, endLine }) {
    clearHighlightedLines()

    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      return
    }

    // ensure startLine and endLine are within the valid range
    const lineCount = cm.lineCount()
    startLine = Math.max(0, Math.min(startLine, lineCount - 1))
    endLine = Math.max(0, Math.min(endLine, lineCount - 1))

    if (startLine > endLine) {
      [startLine, endLine] = [endLine, startLine]
    }

    cm.addLineClass(startLine, 'background', 'g-highlighted-top')
    for (let line = startLine + 1; line < endLine; line++) {
      cm.addLineClass(line, 'background', 'g-highlighted-middle')
    }
    cm.addLineClass(endLine, 'background', 'g-highlighted-bottom')
  }

  function onLineNumberMouseDown (cm, line, gutter, event) {
    if (!event.shiftKey || !startLine.value) {
      // start of multi select with shift-key, do not clear start of selection
      startLine.value = line
    }

    document.addEventListener('mousemove', onLineNumberMouseMove, { passive: true })
    document.addEventListener('mouseup', onLineNumberMouseUp, { passive: true })
  }

  function onLineNumberMouseMove (event) {
    if (!startLine.value) {
      return
    }
    const { line: endLine } = cm.coordsChar({ left: event.clientX, top: event.clientY })
    highlightBoundary({ startLine: startLine.value, endLine })
  }

  function onLineNumberMouseUp (event) {
    let { line: endLine } = cm.coordsChar({ left: event.clientX, top: event.clientY })

    const startLineBgClass = cm.lineInfo(startLine.value)?.bgClass
    const isStartLineHighlighted = startLineBgClass?.split(' ').includes('g-highlighted-top')

    if (startLine.value === endLine && isStartLineHighlighted) {
      // clear highlighted lines if the start line is clicked again
      startLine.value = null
      endLine = null
    }

    setSelectionBoundary({ startLine: startLine.value, endLine })
    highlightBoundary({ startLine: startLine.value, endLine })
    document.removeEventListener('mousemove', onLineNumberMouseMove)
    document.removeEventListener('mouseup', onLineNumberMouseUp)
  }

  function attachGutterClickListener () {
    cm.on('gutterClick', onLineNumberMouseDown)
  }

  function detachAllListeners () {
    cm.off('gutterClick', onLineNumberMouseDown)
    document.removeEventListener('mousemove', onLineNumberMouseMove)
    document.removeEventListener('mouseup', onLineNumberMouseUp)
  }

  return {
    highlightBoundary,
    clearHighlightedLines,
    attachGutterClickListener,
    detachAllListeners,
    selectionBoundary,
  }
}
