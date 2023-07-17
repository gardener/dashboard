<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="d-flex flex-column fill-height position-relative">
    <div v-if="!clean" class="flex-shrink-1">
      <g-alert-banner
        type="warning"
        :identifier="alertBannerIdentifier"
        color="primary"
        transition="slide-y-transition"
      >
        <template #message>
          <slot name="modificationWarning"></slot>
        </template>
      </g-alert-banner>
    </div>
    <div ref="container" :style="containerStyles" :class="containerClass"></div>
    <div v-if="errorMessageInternal" class="flex-shrink-1">
      <g-message
        color="error"
        class="ma-0"
        v-model:message="errorMessageInternal"
        v-model:detailed-message="detailedErrorMessageInternal"
        tile
      ></g-message>
    </div>
    <v-divider></v-divider>
    <div v-if="showToolbar" :style="toolbarStyles" class="d-flex align-center justify-space-between">
      <div class="d-flex align-center justify-start fill-height">
        <div class="px-2">
          <v-tooltip top>
            <template #activator="{ props }">
              <div v-bind="props">
                <g-action-button size="x-small" icon="mdi-reload" @click="reload" :disabled="untouched" />
              </div>
            </template>
            <span>Discard and Reload</span>
          </v-tooltip>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template #activator="{ props }">
              <div v-bind="props">
                <g-action-button size="x-small" icon="mdi-undo" @click="undo" :disabled="historySize.undo === 0" />
              </div>
            </template>
            <span>Undo</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <v-tooltip top>
            <template #activator="{ props }">
              <div v-bind="props">
                <g-action-button size="x-small" icon="mdi-redo" @click="redo" :disabled="historySize.redo === 0" />
              </div>
            </template>
            <span>Redo</span>
          </v-tooltip>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template #activator="{ props }">
              <div v-bind="props">
                <g-action-button size="x-small" icon="mdi-download" @click="downloadContent" />
              </div>
            </template>
            <span>Download</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <g-copy-btn
            :clipboard-text="getContent()"
            @click.stop="focus"
            tooltip-text='Copy'
            :user-feedback="false"
            @copy="onCopy"
            @copy-failed="onCopyFailed"
          >
          </g-copy-btn>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template #activator="{ props }">
              <div v-bind="props">
                <g-action-button size="x-small" :icon="showManagedFields ? 'mdi-text-short' : 'mdi-text-long'" @click="showManagedFields = !showManagedFields" :disabled="!untouched" />
              </div>
            </template>
            <span>{{showManagedFields ? 'Hide' : 'Show'}} managed fields</span>
          </v-tooltip>
        </div>
        <v-divider vertical></v-divider>
      </div>
      <div class="d-flex fill-height align-center justify-end">
        <v-divider vertical></v-divider>
        <slot name="toolbarItemsRight"></slot>
      </div>
    </div>
    <v-tooltip
      right
      absolute
      :model-value="helpTooltip.visible"
      :style="`left: ${helpTooltip.posX}px; top: ${helpTooltip.posY}px`"
      max-width="800px"
      >
      <span class="font-weight-bold">{{helpTooltip.property}}</span><span class="font-style-italic ml-2">{{helpTooltip.type}}</span><br />
      <span class="font-wrap">{{helpTooltip.description}}</span>
    </v-tooltip>
    <v-snackbar v-model="snackbar" top absolute :color="snackbarColor" :timeout="snackbarTimeout">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'pinia'
import download from 'downloadjs'

import { useAuthzStore } from '@/store'

import GCopyBtn from '@/components/GCopyBtn'
import GActionButton from '@/components/GActionButton'
import GMessage from '@/components/GMessage'
import GAlertBanner from '@/components/GAlertBanner'

import { shootItem } from '@/mixins/shootItem'

import { ShootEditorCompletions } from '@/utils/shootEditorCompletions'

// codemirror
import CodeMirror from 'codemirror'
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/mode/yaml/yaml.js'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/seti.css'

// lodash
import get from 'lodash/get'
import has from 'lodash/has'
import pick from 'lodash/pick'
import cloneDeep from 'lodash/cloneDeep'
import assign from 'lodash/assign'
import isEqual from 'lodash/isEqual'

export default {
  components: {
    GCopyBtn,
    GActionButton,
    GMessage,
    GAlertBanner,
  },
  props: {
    alertBannerIdentifier: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    detailedErrorMessage: {
      type: String,
    },
    extraKeys: {
      type: Object,
    },
    hideToolbar: {
      type: Boolean,
    },
    completionPaths: {
      type: Array,
    },
    animateOnAppear: {
      type: Boolean,
    },
  },
  inject: ['yaml', 'api', 'colorMode'],
  data () {
    return {
      conflictPath: null,
      snackbar: false,
      snackbarTimeout: 3000,
      snackbarColor: undefined,
      snackbarText: '',
      clean: true,
      untouched: true,
      historySize: {
        undo: 0,
        redo: 0,
      },
      generation: undefined,
      lineHeight: 21,
      toolbarHeight: 48,
      shootEditorCompletions: undefined,
      helpTooltip: {
        visible: false,
        posX: 0,
        posY: 0,
        property: undefined,
        type: undefined,
        description: undefined,
      },
      showManagedFields: false,
      containerClass: undefined,
      cmInstance: null,
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters(useAuthzStore, ['canPatchShoots']),
    value () {
      let data = cloneDeep(this.shootItem)
      if (data) {
        data = pick(data, ['kind', 'apiVersion', 'metadata', 'spec', 'status'])
        if (!this.showManagedFields && has(data, 'metadata.managedFields')) {
          delete data.metadata.managedFields
        }
        return data
      }
      return undefined
    },
    containerStyles () {
      return {
        flex: '1 1 auto',
        minHeight: `${this.lineHeight * 3}px`,
      }
    },
    toolbarStyles () {
      return {
        flex: '0 0 auto',
        height: `${this.toolbarHeight}px`,
        minHeight: `${this.toolbarHeight}px`,
      }
    },
    errorMessageInternal: {
      get () {
        return this.errorMessage
      },
      set (value) {
        this.$emit('update:error-message', value)
      },
    },
    detailedErrorMessageInternal: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailed-error-message', value)
      },
    },
    isReadOnly () {
      return this.isShootActionsDisabledForPurpose || !this.canPatchShoots
    },
    showToolbar () {
      return !this.isReadOnly && !this.hideToolbar
    },
    theme () {
      return this.colorMode === 'dark'
        ? 'seti'
        : 'default'
    },
  },
  methods: {
    getQualifiedName () {
      const name = get(this, 'value.metadata.name', 'unnamed')
      const projectName = this.shootProjectName
      return `shoot--${projectName}--${name}.yaml`
    },
    undo () {
      if (this.cmInstance) {
        this.cmInstance.execCommand('undo')
        this.cmInstance.focus()
      }
    },
    redo () {
      if (this.cmInstance) {
        this.cmInstance.execCommand('redo')
        this.cmInstance.focus()
      }
    },
    focus () {
      if (this.cmInstance) {
        this.cmInstance.focus()
      }
    },
    setClean (clean) {
      this.clean = clean
      this.$emit('clean', clean)
    },
    setConflictPath (conflictPath) {
      this.conflictPath = conflictPath
      this.$emit('conflict-path', conflictPath)
    },
    reload () {
      this.update(this.value)
    },
    downloadContent () {
      try {
        download(this.getContent(), this.getQualifiedName(), 'text/yaml')
        this.snackbarColor = undefined
        this.snackbarText = 'Content has been downloaded'
        this.snackbar = true
      } catch (err) {
        this.snackbarColor = 'error'
        this.snackbarText = 'Download content failed'
        this.snackbar = true
      }
      this.focus()
    },
    refresh () {
      // use $nextTick as CodeMirror needs to be finished with rendering because refresh method relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
      this.$nextTick(() => this.refreshInstance())
    },
    refreshInstance () {
      if (this.cmInstance) {
        this.cmInstance.refresh()
      }
    },
    createInstance (element) {
      const extraKeys = assign({}, {
        Tab: (instance) => {
          if (instance.somethingSelected()) {
            instance.indentSelection('add')
          } else {
            instance.execCommand('insertSoftTab')
          }
        },
        'Shift-Tab': (instance) => {
          instance.indentSelection('subtract')
        },
        Enter: (instance) => {
          this.shootEditorCompletions.editorEnter(instance)
        },
        'Ctrl-Space': 'autocomplete',
      }, this.extraKeys)
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
        readOnly: this.isReadOnly,
        extraKeys,
        theme: this.theme,
      }
      this.cmInstance = markRaw(CodeMirror(element, options))
      this.cmInstance.setSize('100%', '100%')
      const onChange = ({ doc }) => {
        this.untouched = false
        this.setClean(doc.isClean(this.generation))
        this.historySize = doc.historySize()
        this.errorMessageInternal = undefined
        this.detailedErrorMessageInternal = undefined
      }
      this.cmInstance.on('change', onChange)

      CodeMirror.registerHelper('hint', 'yaml', (editor, options) => {
        options.completeSingle = false
        options.container = this.$refs.container
        if (!this.shootEditorCompletions) {
          return
        }
        return this.shootEditorCompletions.yamlHint(editor)
      })

      let cmTooltipFnTimerID
      const cm = this.cmInstance
      CodeMirror.on(element, 'mouseover', (e) => {
        clearTimeout(cmTooltipFnTimerID)
        this.helpTooltip.visible = false
        cmTooltipFnTimerID = setTimeout(() => {
          if (!this.shootEditorCompletions) {
            return
          }
          const tooltip = this.shootEditorCompletions.editorTooltip(e, cm)
          if (!tooltip) {
            return
          }
          this.helpTooltip.visible = true
          this.helpTooltip.posX = e.clientX
          this.helpTooltip.posY = e.clientY
          this.helpTooltip.property = tooltip.property
          this.helpTooltip.type = tooltip.type
          this.helpTooltip.description = tooltip.description
        }, 200)
      })
    },
    destroyInstance () {
      if (this.cmInstance) {
        const element = this.cmInstance.doc.cm.getWrapperElement()
        if (element && element.remove) {
          element.remove()
        }
      }
      this.cmInstance = undefined
    },
    clearHistory () {
      if (this.cmInstance) {
        this.cmInstance.doc.clearHistory()
        this.generation = this.cmInstance.doc.changeGeneration()
        this.setClean(true)
        this.untouched = true
        this.setConflictPath(null)
        this.historySize.undo = 0
        this.historySize.redo = 0
      }
    },
    getContent () {
      if (this.cmInstance) {
        return this.cmInstance.doc.getValue()
      }
      return ''
    },
    setContent (value) {
      if (this.cmInstance) {
        const editor = this.cmInstance
        const doc = editor.doc
        const cursor = doc.getCursor()
        const { left, top } = editor.getScrollInfo() || {}
        doc.setValue(value)
        editor.focus()
        if (cursor) {
          doc.setCursor(cursor)
        }
        editor.scrollTo(left, top)
        this.clearHistory()
      }
    },
    async update (value = this.value) {
      if (value) {
        this.setContent(await this.yaml.dump(value))
      }
    },
    onCopy () {
      this.snackbarColor = undefined
      this.snackbarText = 'Copied content to clipboard'
      this.snackbar = true
    },
    onCopyFailed () {
      this.snackbarColor = 'error'
      this.snackbarText = 'Copy to clipboard failed'
      this.snackbar = true
    },
    animateExpansion () {
      this.containerClass = 'collapsed'
      this.$nextTick(() => {
        // wait for ui to render collapsed class before setting animation class
        this.containerClass = 'animate'
        setTimeout(() => {
          this.containerClass = undefined
        }, 1500) // remove after animation ends (1.5 sec)
      })
    },
  },
  async mounted () {
    if (this.animateOnAppear) {
      this.animateExpansion()
    }

    this.createInstance(this.$refs.container)
    this.update(this.value)
    this.refresh()

    const shootSchemaDefinition = await this.api.getShootSchemaDefinition()
    const shootProperties = get(shootSchemaDefinition, 'properties', {})
    const indentUnit = get(this.cmInstance, 'options.indentUnit', 2)
    this.shootEditorCompletions = new ShootEditorCompletions(shootProperties, indentUnit, this.completionPaths)
  },
  watch: {
    canPatchShoots (value) {
      this.cmInstance.setOption('readOnly', this.isReadOnly)
    },
    shootPurpose (value) {
      this.cmInstance.setOption('readOnly', this.isReadOnly)
    },
    value: {
      deep: true,
      handler (newValue, oldValue) {
        if (this.untouched) {
          return this.update(newValue)
        }
        for (const path of ['spec', 'metadata.annotations', 'metadata.labels']) {
          const newProp = get(newValue, path)
          const oldProp = get(oldValue, path)
          if (!isEqual(newProp, oldProp)) {
            this.setConflictPath(path)
            break
          }
        }
      },
    },
    theme (value) {
      this.cmInstance.setOption('theme', value)
    },
  },
  beforeUnmount () {
    this.destroyInstance()
  },
}
</script>

<style lang="scss" scoped>
  .no-margin {
    margin: 0 !important;
  }
  .position-relative {
    position: relative !important;
  }
  :deep(.cm-tab) {
     background: url('../assets/tab.png');
     background-position: right;
     background-repeat: no-repeat;
  }
  .font-style-italic {
    font-style: italic;
  }
  .font-wrap {
    white-space: pre-wrap;
  }
</style>
<style lang="scss">
  @import 'vuetify/settings';

  .CodeMirror-hint {

    .ghint-type  {
      color: #000;

      .property {
        font-weight: bold;
        font-size: 14px;
      }
      .type {
        font-style: italic;
        padding-left: 10px;
        font-size: 13px;
      }
    }
  }

  .CodeMirror-hint .ghint-desc  {
    white-space: pre-wrap;
    max-width: 800px;
    padding: 10px;

    .description {
      font-family: Roboto, sans-serif;
      font-size: 13px;
      color: map-get($grey, 'darken-3');
    }
  }

  .CodeMirror-hint-active {
    background-color: map-get($grey, 'lighten-4') !important;
  }

  .CodeMirror-hints.seti {
    background-color: #000;
  }

  .seti {
    .CodeMirror-hint {
      .ghint-type  {
        color: #fff;
      }
    }

    .CodeMirror-hint .ghint-desc  {
      .description {
        color: map-get($grey, 'lighten-3');
      }
    }

    .CodeMirror-hint-active {
      background-color: map-get($grey, 'darken-4') !important;
    }
  }

  .collapsed .CodeMirror-lines {
    max-height: 0px;
  }

  .animate .CodeMirror-lines {
    transition: max-height 1.5s;
    max-height: 100vh;
  }
</style>
