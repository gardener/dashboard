//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
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
} from 'vue'
import { useTheme } from 'vuetify'
import yaml from 'js-yaml'

import { useLocalStorageStore } from '@/store/localStorage'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'
import { useSeedSchemaDefinition } from '@/composables/useSeedSchemaDefinition'

import omit from 'lodash/omit'
import get from 'lodash/get'

export function useSeedEditor (initialValue, options = {}) {
  const {
    api = useApi(),
    logger = useLogger(),
    theme = useTheme(),
    localStorageStore = useLocalStorageStore(),
  } = options

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

  const isReadOnly = computed(() => {
    return true
  })

  const isDarkMode = computed(() => {
    return !!theme.global.current.value?.dark
  })

  const seedItem = computed(() => {
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
    const name = get(seedItem.value, ['metadata', 'name'], 'unnamed')
    return `seed--${name}.yaml`
  })
  const schemaDefinition = useSeedSchemaDefinition({ api })

  let cm = null

  async function loadEditor (element) {
    try {
      const { useCodemirror } = await import('./useCodemirror')
      cm = useCodemirror(element, {
        ...options,
        schemaDefinition,
        doc: yaml.dump(seedItem.value),
        onDocChanged ({ modified, undoDepth, redoDepth }) {
          if (!touched.value && modified) {
            touched.value = true
          }
          clean.value = !modified
          historySize.value = {
            undo: undoDepth,
            redo: redoDepth,
          }
        },
        showTooltip (props) {
          Object.assign(helpTooltip, props)
          helpTooltip.visible = true
        },
        hideTooltip () {
          helpTooltip.visible = false
        },
        readOnly: isReadOnly.value,
        darkMode: isDarkMode.value,
      })
    } catch (err) {
      logger.error('Failed to create codemirror instance: %s', err.message)
    }
  }

  function destroyEditor () {
    cm?.destroy()
  }

  function setEditorValue (value) {
    if (value) {
      cm?.setDocValue(yaml.dump(value))
    }
  }

  function refreshEditor () {
    setEditorValue(seedItem.value)
  }

  function focusEditor () {
    cm?.focus()
  }

  function getDocumentValue () {
    return cm?.getDocValue()
  }

  function execUndo () {
    cm?.undo()
  }

  function execRedo () {
    cm?.redo()
  }

  watch(renderWhitespaces, value => {
    cm?.dispatchWhitespaceEffect(value)
  })

  watch(isReadOnly, value => {
    cm?.dispatchReadOnlyEffect(value)
  })

  watch(isDarkMode, value => {
    cm?.dispatchThemeEffect(value)
  })

  watch(seedItem, newValue => {
    setEditorValue(newValue)
  })

  return {
    touched,
    clean,
    showManagedFields,
    renderWhitespaces,
    historySize,
    helpTooltip,
    loadEditor,
    destroyEditor,
    getDocumentValue,
    setEditorValue,
    refreshEditor,
    focusEditor,
    execUndo,
    execRedo,
    isReadOnly,
    filename,
  }
}
