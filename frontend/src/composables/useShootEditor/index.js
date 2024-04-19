//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  reactive,
  markRaw,
  unref,
  isProxy,
  toRaw,
  watch,
  watchEffect,
} from 'vue'
import { computedAsync } from '@vueuse/core'
import { useTheme } from 'vuetify'
import yaml from 'js-yaml'

import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useLocalStorageStore } from '@/store/localStorage'

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'

import {
  createShootEditor,
  createShootEditorCompletions,
  registerShootEditorHelper,
  addShootEditorEventListener,
} from './helper'

import {
  get,
  omit,
  isEqual,
} from '@/lodash'

export function useShootEditor (initialValue, options = {}) {
  const {
    api = useApi(),
    logger = useLogger(),
    theme = useTheme(),
    authzStore = useAuthzStore(),
    projectStore = useProjectStore(),
    localStorageStore = useLocalStorageStore(),
  } = options

  const cm = shallowRef(null)
  const completions = shallowRef(null)
  const conflictPath = ref(null)
  const generation = ref(0)
  const touched = ref(false)
  const clean = ref(true)
  const showManagedFields = ref(false)
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

  const schemaDefinition = computedAsync(() => {
    return api.getShootSchemaDefinition()
  }, null)

  const defaultExtraKeys = markRaw({
    Tab: instance => {
      if (instance.somethingSelected()) {
        instance.indentSelection('add')
      } else {
        instance.execCommand('insertSoftTab')
      }
    },
    'Shift-Tab': instance => {
      instance.indentSelection('subtract')
    },
    Enter: instance => {
      completions.value?.editorEnter(instance)
    },
    'Ctrl-Space': 'autocomplete',
  })

  const extraKeys = computed(() => {
    const extraKeyEntries = Object.entries({
      ...defaultExtraKeys,
      ...options.extraKeys,
    })
    const extraKeys = {}
    for (const [key, value] of extraKeyEntries) {
      extraKeys[localStorageStore.editorShortcuts[key] ?? key] = value
    }
    return extraKeys
  })

  const isReadOnly = computed(() => {
    return isShootActionsDisabled.value || !authzStore.canPatchShoots
  })

  const cmTheme = computed(() => {
    return theme.global.current.value?.dark ? 'seti' : 'default'
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
    const namespace = get(shootItem.value, 'metadata.namespace')
    if (!namespace) {
      return get(options, 'filename', 'unknown.yaml')
    }
    const name = get(shootItem.value, 'metadata.name', 'unnamed')
    const projectName = projectStore.projectNameByNamespace(namespace)
    return `shoot--${projectName}--${name}.yaml`
  })

  const isShootActionsDisabled = computed(() => {
    return get(shootItem.value, 'spec.purpose') === 'infrastructure'
  })

  function createEditor (element) {
    const options = {
      mode: 'text/x-yaml',
      autofocus: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      smartIndent: true,
      scrollbarStyle: 'native',
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity, // make sure the whole shoot resource is laoded so that the browser's text search works on it
      readOnly: isReadOnly.value,
      extraKeys: extraKeys.value,
      theme: cmTheme.value,
    }

    cm.value = createShootEditor(element, options)
    cm.value.setSize('100%', '100%')
    cm.value.on('change', instance => {
      touched.value = true
      clean.value = instance.doc.isClean(generation.value)
      historySize.value = instance.doc.historySize()
    })

    registerShootEditorHelper('hint', 'yaml', editor => {
      completions.value?.yamlHint(editor)
    })

    let cmTooltipFnTimerID
    addShootEditorEventListener(element, 'mouseover', e => {
      clearTimeout(cmTooltipFnTimerID)
      helpTooltip.visible = false
      cmTooltipFnTimerID = setTimeout(() => {
        const tooltip = completions.value?.editorTooltip(e, cm.value)
        if (!tooltip) {
          return
        }
        helpTooltip.visible = true
        helpTooltip.posX = e.clientX
        helpTooltip.posY = e.clientY
        helpTooltip.property = tooltip.property
        helpTooltip.type = tooltip.type
        helpTooltip.description = tooltip.description
      }, 200)
    })
  }

  function destroyEditor () {
    if (cm.value) {
      const element = cm.value.doc.cm.getWrapperElement()
      if (element && element.remove) {
        element.remove()
      }
    }
    cm.value = null
  }

  function getDocumentValue () {
    if (cm.value) {
      return cm.value.doc.getValue()
    }
    return ''
  }

  function setDocumentValue (value) {
    if (cm.value) {
      const cursor = cm.value.doc.getCursor()
      const { left, top } = cm.value.getScrollInfo() || {}
      cm.value.doc.setValue(value)
      cm.value.focus()
      if (cursor) {
        cm.value.doc.setCursor(cursor)
      }
      cm.value.scrollTo(left, top)
      clearDocumentHistory()
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

  function refreshEditor () {
    if (cm.value) {
      cm.value.refresh()
    }
  }

  function reloadEditor () {
    resetEditor()
    refreshEditor()
  }

  function focusEditor () {
    if (cm.value) {
      cm.value.focus()
    }
  }

  function getEditorScrollInfo () {
    if (cm.value) {
      return cm.value.getScrollInfo()
    }
  }

  function clearDocumentHistory () {
    if (cm.value) {
      cm.value.doc.clearHistory()
      generation.value = cm.value.doc.changeGeneration()
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
    if (cm.value) {
      cm.value.execCommand('undo')
      cm.value.focus()
    }
  }

  function execRedo () {
    if (cm.value) {
      cm.value.execCommand('redo')
      cm.value.focus()
    }
  }

  function toValue (value) {
    value = unref(value)
    return isProxy(value) ? toRaw(value) : value
  }

  watchEffect(() => {
    const shootProperties = get(schemaDefinition.value, 'properties', {})
    const indentUnit = get(cm.value, 'options.indentUnit', 2)
    const completionPaths = get(options, 'completionPaths', [])
    completions.value = createShootEditorCompletions(shootProperties, indentUnit, completionPaths, logger)
  })

  watch(isReadOnly, value => {
    cm.value.setOption('readOnly', value)
  })

  watch(cmTheme, value => {
    cm.value.setOption('theme', value)
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
    historySize,
    helpTooltip,
    createEditor,
    destroyEditor,
    getDocumentValue,
    setDocumentValue,
    getEditorValue,
    setEditorValue,
    refreshEditor,
    resetEditor,
    reloadEditor,
    focusEditor,
    getEditorScrollInfo,
    clearDocumentHistory,
    execUndo,
    execRedo,
    isReadOnly,
    filename,
  }
}
