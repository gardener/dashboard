//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  toRef,
  shallowRef,
  computed,
  reactive,
  unref,
  watch,
  watchEffect,
} from 'vue'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import yaml from 'js-yaml'
import {
  EditorView,
  keymap,
  highlightActiveLine,
  lineNumbers,
} from '@codemirror/view'
import {
  EditorState,
  Compartment,
} from '@codemirror/state'
import { yaml as cmYaml } from '@codemirror/lang-yaml'
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

import { useLocalStorageStore } from '@/store/localStorage'
import { useProjectStore } from '@/store/project'
import { useAuthzStore } from '@/store/authz'

import { useEditorLineHighlighter } from '@/composables/useEditorLineHighlighter'
import { useEditorWhitespace } from '@/composables/useEditorWhitespace'
import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import {
  createEditor,
  EditorCompletions,
} from './helper'

import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import get from 'lodash/get'

export function useShootEditor (initialValue, options = {}) {
  const {
    api = useApi(),
    logger = useLogger(),
    theme = useTheme(),
    authzStore = useAuthzStore(),
    projectStore = useProjectStore(),
    localStorageStore = useLocalStorageStore(),
    disableLineHighlighting = false,
  } = options

  const { showAllWhitespace } = useEditorWhitespace()

  const cmView = shallowRef(null)
  const completions = shallowRef(null)
  const conflictPath = ref(null)
  const touched = ref(false)
  const clean = ref(true)
  const showManagedFields = ref(false)
  const renderWhitespaces = toRef(localStorageStore, 'renderEditorWhitespaes')
  const historySize = shallowRef({
    undo: 0,
    redo: 0,
  })
  const helpTooltip = reactive({
    visible: false,
    posX: 0,
    posY: 0,
    property: undefined,
    type: undefined,
    description: undefined,
  })

  let editorLineHighlighter = null
  let initialDocumentValue = null

  const schemaDefinition = computedAsync(() => {
    return api.getShootSchemaDefinition()
  }, null)

  const defaultExtraKeys = [
    {
      key: 'Enter',
      run: view => {
        completions.value?.editorEnter(view)
        return true
      },
    },
  ]

  function getExtraKeys () {
    const extraKeys = [
      ...defaultExtraKeys,
      ...(options.extraKeys ?? []),
    ]
    for (const extraKey of extraKeys) {
      if (get(localStorageStore.editorShortcuts, [extraKey.key])) {
        extraKey.key = get(localStorageStore.editorShortcuts, [extraKey.key])
      }
    }
    return extraKeys
  }

  const isReadOnly = computed(() => {
    return isShootActionsDisabled.value || !authzStore.canPatchShoots
  })

  const isDarkMode = computed(() => {
    return !!theme.global.current.value?.dark
  })

  const shootItem = computed(() => {
    const value = unref(initialValue)
    if (!value) {
      return null
    }
    const {
      kind,
      apiVersion,
      metadata,
      spec,
      status,
    } = value
    return {
      kind,
      apiVersion,
      metadata: !showManagedFields.value && metadata?.managedFields
        ? omit(metadata, 'managedFields')
        : metadata,
      spec,
      status,
    }
  })

  const filename = computed(() => {
    const namespace = get(shootItem.value, ['metadata', 'namespace'])
    if (!namespace) {
      return get(options, ['filename'], 'unknown.yaml')
    }
    const name = get(shootItem.value, ['metadata', 'name'], 'unnamed')
    const projectName = projectStore.projectNameByNamespace(namespace)
    return `shoot--${projectName}--${name}.yaml`
  })

  const isShootActionsDisabled = computed(() => {
    return get(shootItem.value, ['spec', 'purpose']) === 'infrastructure'
  })

  let cmTooltipFnTimerID
  const themeCompartment = new Compartment()
  const readonlyCompartment = new Compartment()
  const historyCompartment = new Compartment()
  const whitespacesCompartment = new Compartment()

  async function loadEditor (element) {
    try {
      const state = EditorState.create({
        extensions: [
          cmYaml(),
          highlightActiveLine(),
          EditorView.lineWrapping, // Enable line wrapping
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              touched.value = true
              clean.value = getDocumentValue() === initialDocumentValue
              const undo = undoDepth(cmView.value.state)
              const redo = redoDepth(cmView.value.state)
              historySize.value = { undo, redo }
            }
          }),
          EditorView.domEventHandlers({
            mouseover: (e, view) => {
              clearTimeout(cmTooltipFnTimerID)
              helpTooltip.visible = false
              cmTooltipFnTimerID = setTimeout(() => {
                const tooltip = completions.value?.editorTooltip(e, view)
                if (!tooltip) {
                  return
                }

                helpTooltip.visible = true
                helpTooltip.posX = e.clientX
                helpTooltip.posY = e.clientY
                helpTooltip.property = tooltip.property
                helpTooltip.type = tooltip.detail
                helpTooltip.description = tooltip.info
              }, 200)
            },
          }),
          keymap.of(getExtraKeys()),
          keymap.of([
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
          historyCompartment.of(history()),
          readonlyCompartment.of(EditorView.editable.of(!isReadOnly.value)),
          themeCompartment.of([isDarkMode.value ? oneDark : [], syntaxHighlighting(isDarkMode.value ? oneDarkHighlightStyle : defaultHighlightStyle)]),
          lineNumbers(),
          whitespacesCompartment.of(showAllWhitespace),
        ],
      })
      cmView.value = await createEditor({ parent: element, state })
      resetEditor()

      if (!disableLineHighlighting) {
        editorLineHighlighter = useEditorLineHighlighter(cmView.value)
      }
    } catch (err) {
      logger.error('Failed to create codemirror instance: %s', err.message)
    }
  }

  function destroyEditor () {
    if (editorLineHighlighter) {
      editorLineHighlighter.destroy()
      editorLineHighlighter = null
    }
    if (cmView.value) {
      cmView.value.destroy()
      const element = cmView.value.dom
      if (element && element.remove) {
        element.remove()
      }
      cmView.value = null
    }
  }

  function getDocumentValue () {
    if (cmView.value) {
      return cmView.value.state.doc.toString()
    }
    return ''
  }

  function setDocumentValue (value) {
    if (cmView.value) {
      const state = cmView.value.state
      const selection = state.selection
      const scrollPos = cmView.value.scrollDOM.scrollTop

      const transaction = state.update({
        changes: { from: 0, to: state.doc.length, insert: value },
        selection,
      })

      cmView.value.dispatch(transaction)
      cmView.value.scrollDOM.scrollTop = scrollPos
      cmView.value.focus()

      clearDocumentHistory()
      initialDocumentValue = value
    }
  }

  function getEditorValue () {
    const value = getDocumentValue()
    if (value) {
      return yaml.load(value)
    }
    return null
  }

  function setEditorValue (value) {
    if (value) {
      setDocumentValue(yaml.dump(value))
    }
  }

  function resetEditor () {
    setEditorValue(shootItem.value)
  }

  function reloadEditor () {
    resetEditor()
  }

  function focusEditor () {
    if (cmView.value) {
      cmView.value.focus()
    }
  }

  function clearDocumentHistory () {
    if (cmView.value) {
      cmView.value.dispatch({
        effects: historyCompartment.reconfigure([]),
      })
      cmView.value.dispatch({
        effects: historyCompartment.reconfigure(history()),
      })
      clean.value = true
      touched.value = false
      conflictPath.value = null
      historySize.value = {
        undo: 0,
        redo: 0,
      }
    }
  }

  function execUndo () {
    if (cmView.value) {
      undo(cmView.value)
    }
  }

  function execRedo () {
    if (cmView.value) {
      redo(cmView.value)
    }
  }

  watchEffect(() => {
    if (cmView.value) {
      if (schemaDefinition.value) {
        const shootProperties = get(schemaDefinition.value, ['properties'], {})
        completions.value = new EditorCompletions(shootProperties, {
          cmView: cmView.value,
          completionPaths: get(options, ['completionPaths'], []),
          logger,
        })
      }

      if (renderWhitespaces.value) {
        cmView.value.dispatch({
          effects: whitespacesCompartment.reconfigure(showAllWhitespace),
        })
      } else {
        cmView.value.dispatch({
          effects: whitespacesCompartment.reconfigure([]),
        })
      }
    }
  })

  watch(isReadOnly, isReadOnly => {
    cmView.value.dispatch({
      effects: readonlyCompartment.reconfigure(EditorView.editable.of(isReadOnly)),
    })
  })

  watch(isDarkMode, isDarkMode => {
    cmView.value.dispatch({
      effects: themeCompartment.reconfigure([
        isDarkMode ? oneDark : [],
        syntaxHighlighting(isDarkMode ? oneDarkHighlightStyle : defaultHighlightStyle),
      ]),
    })
  })

  watch(shootItem, (newValue, oldValue) => {
    if (!touched.value) {
      setEditorValue(newValue)
      return
    }
    for (const path of ['spec', 'metadata.annotations', 'metadata.labels']) {
      const newProp = get(newValue, path)
      const oldProp = get(oldValue, path)
      if (!isEqual(newProp, oldProp)) {
        conflictPath.value = path
        break
      }
    }
  })

  return {
    conflictPath,
    touched,
    clean,
    showManagedFields,
    renderWhitespaces,
    historySize,
    helpTooltip,
    loadEditor,
    destroyEditor,
    getDocumentValue,
    setDocumentValue,
    getEditorValue,
    setEditorValue,
    resetEditor,
    reloadEditor,
    focusEditor,
    clearDocumentHistory,
    execUndo,
    execRedo,
    isReadOnly,
    filename,
  }
}
