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
} from 'vue'
import { useTheme } from 'vuetify'
import yaml from 'js-yaml'

import { useLocalStorageStore } from '@/store/localStorage'
import { useProjectStore } from '@/store/project'
import { useAuthzStore } from '@/store/authz'

import { useLogger } from '@/composables/useLogger'

import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import get from 'lodash/get'

export function useShootEditor (initialValue, options = {}) {
  const {
    logger = useLogger(),
    theme = useTheme(),
    authzStore = useAuthzStore(),
    projectStore = useProjectStore(),
    localStorageStore = useLocalStorageStore(),
  } = options

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

  function getExtraKeys () {
    const extraKeys = get(options, ['extraKeys'], [])
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

  let cm = null

  async function loadEditor (element) {
    try {
      const { useCodemirror } = await import('./useCodemirror')
      cm = useCodemirror(element, {
        ...options,
        doc: yaml.dump(shootItem.value),
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
        extraKeys: getExtraKeys(),
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

  function getEditorValue () {
    const value = cm?.getDocValue()
    return value
      ? yaml.load(value)
      : null
  }

  function setEditorValue (value) {
    if (value) {
      cm?.setDocValue(yaml.dump(value))
      setEditorTouched(false)
      resetEditorHistory()
    }
  }

  function refreshEditor () {
    setEditorValue(shootItem.value)
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

  function setEditorTouched (editorTouched) {
    clean.value = !editorTouched
    touched.value = editorTouched
  }

  function resetEditorHistory () {
    cm?.clearDocHistory()
    historySize.value = {
      undo: 0,
      redo: 0,
    }
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

  watch(shootItem, (newValue, oldValue) => {
    conflictPath.value = null
    if (!touched.value) {
      setEditorValue(newValue)
      return
    }
    const paths = [
      ['spec'],
      ['metadata', 'annotations'],
      ['metadata', 'labels'],
    ]

    for (const path of paths) {
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
    setEditorTouched,
    touched,
    clean,
    showManagedFields,
    renderWhitespaces,
    historySize,
    helpTooltip,
    loadEditor,
    destroyEditor,
    getDocumentValue,
    getEditorValue,
    setEditorValue,
    refreshEditor,
    focusEditor,
    execUndo,
    execRedo,
    isReadOnly,
    filename,
  }
}
