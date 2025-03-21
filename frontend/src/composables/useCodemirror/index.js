//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { computed } from 'vue'
import {
  EditorView,
  keymap,
  highlightActiveLine,
  lineNumbers,
} from '@codemirror/view'
import {
  EditorState,
  Compartment,
  Transaction,
} from '@codemirror/state'
import {
  indentUnit,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language'
import {
  defaultKeymap,
  indentWithTab,
  history,
  historyKeymap,
  undo,
  redo,
  undoDepth,
  redoDepth,
} from '@codemirror/commands'
import { autocompletion } from '@codemirror/autocomplete'
import { searchKeymap } from '@codemirror/search'
import {
  oneDark,
  oneDarkHighlightStyle,
} from '@codemirror/theme-one-dark'
import { yaml } from '@codemirror/lang-yaml'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'
import { useShootSchemaDefinition } from '@/composables/useShootSchemaDefinition'

import {
  createWhitespaceViewPlugin,
  useLineHighlighter,
  EditorCompletions,
} from './helper'

import get from 'lodash/get'
import noop from 'lodash/noop'

function dispatchEffects (view, effects) {
  view.dispatch({ effects })
}

const readOnlyCompartment = new Compartment()

function createReadOnlyExtension (value) {
  return EditorState.readOnly.of(value)
}

function dispatchReadOnlyEffect (view, value) {
  const content = createReadOnlyExtension(value)
  dispatchEffects(view, readOnlyCompartment.reconfigure(content))
}

const themeCompartment = new Compartment()

function createThemeExtension (value) {
  const ext = []
  if (value) {
    ext.push(oneDark)
    ext.push(syntaxHighlighting(oneDarkHighlightStyle))
  } else {
    ext.push(syntaxHighlighting(defaultHighlightStyle))
  }
  return ext
}

function dispatchThemeEffect (view, value) {
  const content = createThemeExtension(value)
  dispatchEffects(view, themeCompartment.reconfigure(content))
}

const historyCompartment = new Compartment()

function createHistoryExtension (value) {
  return value
    ? history()
    : []
}

function dispatchHistoryEffect (view, value) {
  const content = createHistoryExtension(value)
  dispatchEffects(view, historyCompartment.reconfigure(content))
}

const whitespaceViewPlugin = createWhitespaceViewPlugin()
const whitespacesCompartment = new Compartment()

function createWhitespaceExtension (value) {
  return value
    ? whitespaceViewPlugin
    : []
}

function dispatchWhitespaceEffect (view, value) {
  const content = createWhitespaceExtension(value)
  dispatchEffects(view, whitespacesCompartment.reconfigure(content))
}

export function useCodemirror (element, options) {
  const {
    api = useApi(),
    logger = useLogger(),
    doc = '',
    onDocChanged = noop,
    showTooltip = noop,
    hideTooltip = noop,
    extraKeys = [],
    completionPaths = [],
    readOnly = false,
    darkMode = false,
    disableLineHighlighting = false,
  } = options

  const schemaDefinition = useShootSchemaDefinition({ api })
  const completions = computed(() => {
    if (!schemaDefinition.value) {
      return null
    }
    const shootProperties = get(schemaDefinition.value, ['properties'], {})
    return new EditorCompletions(shootProperties, {
      indentUnit: view.state.facet(indentUnit).length,
      supportedPaths: completionPaths,
      logger,
    })
  })

  const enterKey = {
    key: 'Enter',
    run (view) {
      if (!completions.value) {
        return false
      }
      completions.value.editorEnter(view)
      return true
    },
  }

  let initialDocValue = doc
  let mouseoverTimeoutId

  const state = EditorState.create({
    doc,
    extensions: [
      yaml(),
      highlightActiveLine(),
      EditorView.lineWrapping, // Enable line wrapping
      EditorView.updateListener.of(e => {
        if (e.docChanged) {
          const docValue = e.state.doc.toString()
          onDocChanged({
            modified: docValue !== initialDocValue,
            undoDepth: undoDepth(e.state),
            redoDepth: redoDepth(e.state),
          })
        }
      }),
      EditorView.domEventHandlers({
        mouseover (e, view) {
          mouseoverTimeoutId = setTimeout(() => {
            const tooltip = completions.value?.editorTooltip(e, view)
            if (!tooltip) {
              return
            }
            showTooltip({
              posX: e.clientX,
              posY: e.clientY,
              property: tooltip.property,
              type: tooltip.detail,
              description: tooltip.info,
            })
          }, 200)
        },
        mouseout () {
          clearTimeout(mouseoverTimeoutId)
          hideTooltip()
        },
      }),
      keymap.of([
        enterKey,
        ...extraKeys,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      indentUnit.of('  '),
      autocompletion({
        override: [
          context => {
            return completions.value?.yamlHint(context)
          },
        ],
      }),
      EditorView.theme({}),
      lineNumbers(),
      readOnlyCompartment.of(createReadOnlyExtension(readOnly)),
      themeCompartment.of(createThemeExtension(darkMode)),
      whitespacesCompartment.of(createWhitespaceExtension(true)),
      historyCompartment.of(createHistoryExtension(true)),
    ],
  })
  const view = new EditorView({
    parent: element,
    state,
  })
  const lineHighlighter = !disableLineHighlighting
    ? useLineHighlighter(view)
    : null

  function destroy () {
    if (lineHighlighter) {
      lineHighlighter.destroy()
    }

    view.destroy()
    const element = view.dom
    if (element && element.remove) {
      element.remove()
    }
  }

  function getDocValue () {
    return view.state.doc.toString()
  }

  function setDocValue (value) {
    initialDocValue = value

    const state = view.state
    const selection = state.selection
    const scrollPos = view.scrollDOM.scrollTop

    const transaction = state.update({
      changes: {
        from: 0,
        to: state.doc.length,
        insert: value,
      },
      selection,
      annotations: Transaction.remote.of(true),
    })

    view.dispatch(transaction)
    view.scrollDOM.scrollTop = scrollPos
    view.focus()
  }

  function clearDocHistory () {
    dispatchHistoryEffect(view, false)
    dispatchHistoryEffect(view, true)
  }

  return {
    getDocValue,
    setDocValue,
    clearDocHistory,
    destroy,
    focus () {
      view.focus()
    },
    undo () {
      undo(view)
    },
    redo () {
      redo(view)
    },
    dispatchWhitespaceEffect (value) {
      dispatchWhitespaceEffect(view, value)
    },
    dispatchThemeEffect (value) {
      dispatchThemeEffect(view, value)
    },
    dispatchReadOnlyEffect (value) {
      dispatchReadOnlyEffect(view, value)
    },
    dispatchHistoryEffect (value) {
      dispatchHistoryEffect(view, value)
    },
  }
}
