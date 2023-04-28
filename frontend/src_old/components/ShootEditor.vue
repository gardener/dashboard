<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="d-flex flex-column fill-height position-relative">
    <div v-if="!clean" class="flex-shrink-1">
      <g-alert
        type="warning"
        :identifier="alertBannerIdentifier"
        color="primary"
        transition="slide-y-transition"
      >
        <template v-slot:message>
          <slot name="modificationWarning"></slot>
        </template>
      </g-alert>
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
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn icon :disabled="untouched" @click="reload">
                  <v-icon small>mdi-reload</v-icon>
                </v-btn>
              </div>
            </template>
            <span>Discard and Reload</span>
          </v-tooltip>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn icon :disabled="!historySize.undo" @click="undo">
                  <v-icon small>mdi-undo</v-icon>
                </v-btn>
              </div>
            </template>
            <span>Undo</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn icon :disabled="!historySize.redo" @click="redo">
                  <v-icon small>mdi-redo</v-icon>
                </v-btn>
              </div>
            </template>
            <span>Redo</span>
          </v-tooltip>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn icon @click="downloadContent">
                  <v-icon small>mdi-download</v-icon>
                </v-btn>
              </div>
            </template>
            <span>Download</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <copy-btn
            :clipboard-text="getContent()"
            @click.stop="focus"
            tooltip-text='Copy'
            :user-feedback="false"
            @copy="onCopy"
            @copy-failed="onCopyFailed"
          >
          </copy-btn>
        </div>
        <v-divider vertical></v-divider>
        <div class="px-2">
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <div v-on="on">
                <v-btn icon @click="showManagedFields = !showManagedFields" :disabled="!untouched">
                  <v-icon small>{{showManagedFields ? 'mdi-text-short' : 'mdi-text-subject'}}</v-icon>
                </v-btn>
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
      :value="helpTooltip.visible"
      :position-x="helpTooltip.posX"
      :position-y="helpTooltip.posY"
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
import CopyBtn from '@/components/CopyBtn.vue'
import GMessage from '@/components/GMessage.vue'
import GAlert from '@/components/GAlert.vue'
import { mapState, mapGetters } from 'vuex'
import { getShootSchemaDefinition } from '@/utils/api'
import { ShootEditorCompletions } from '@/utils/shootEditorCompletions'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'

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
    CopyBtn,
    GMessage,
    GAlert
  },
  name: 'shoot-editor',
  props: {
    alertBannerIdentifier: {
      type: String
    },
    errorMessage: {
      type: String
    },
    detailedErrorMessage: {
      type: String
    },
    extraKeys: {
      type: Object
    },
    hideToolbar: {
      type: Boolean
    },
    completionPaths: {
      type: Array
    },
    animateOnAppear: {
      type: Boolean
    }
  },
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
        redo: 0
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
        description: undefined
      },
      showManagedFields: false,
      containerClass: undefined
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'colorScheme',
      'canPatchShoots',
      'projectNameByNamespace'
    ]),
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
        minHeight: `${this.lineHeight * 3}px`
      }
    },
    toolbarStyles () {
      return {
        flex: '0 0 auto',
        height: `${this.toolbarHeight}px`,
        minHeight: `${this.toolbarHeight}px`
      }
    },
    errorMessageInternal: {
      get () {
        return this.errorMessage
      },
      set (value) {
        this.$emit('update:error-message', value)
      }
    },
    detailedErrorMessageInternal: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailed-error-message', value)
      }
    },
    isReadOnly () {
      return this.isShootActionsDisabledForPurpose || !this.canPatchShoots
    },
    showToolbar () {
      return !this.isReadOnly && !this.hideToolbar
    },
    theme () {
      return this.colorScheme === 'dark'
        ? 'seti'
        : 'default'
    }
  },
  methods: {
    getQualifiedName () {
      const name = get(this, 'value.metadata.name', 'unnamed')
      const namespace = this.namespace
      const projectName = this.projectNameByNamespace({ namespace })
      return `shoot--${projectName}--${name}.yaml`
    },
    undo () {
      if (this.$instance) {
        this.$instance.execCommand('undo')
        this.$instance.focus()
      }
    },
    redo () {
      if (this.$instance) {
        this.$instance.execCommand('redo')
        this.$instance.focus()
      }
    },
    focus () {
      if (this.$instance) {
        this.$instance.focus()
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
      if (this.$instance) {
        this.$instance.refresh()
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
        'Ctrl-Space': 'autocomplete'
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
        theme: this.theme
      }
      this.$instance = CodeMirror(element, options)
      this.$instance.setSize('100%', '100%')
      const onChange = ({ doc }) => {
        this.untouched = false
        this.setClean(doc.isClean(this.generation))
        this.historySize = doc.historySize()
        this.errorMessageInternal = undefined
        this.detailedErrorMessageInternal = undefined
      }
      this.$instance.on('change', onChange)

      CodeMirror.registerHelper('hint', 'yaml', (editor, options) => {
        options.completeSingle = false
        options.container = this.$refs.container
        if (!this.shootEditorCompletions) {
          return
        }
        return this.shootEditorCompletions.yamlHint(editor)
      })

      let cmTooltipFnTimerID
      const cm = this.$instance
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
      if (this.$instance) {
        const element = this.$instance.doc.cm.getWrapperElement()
        if (element && element.remove) {
          element.remove()
        }
      }
      this.$instance = undefined
    },
    clearHistory () {
      if (this.$instance) {
        this.$instance.doc.clearHistory()
        this.generation = this.$instance.doc.changeGeneration()
        this.setClean(true)
        this.untouched = true
        this.setConflictPath(null)
        this.historySize.undo = 0
        this.historySize.redo = 0
      }
    },
    getContent () {
      if (this.$instance) {
        return this.$instance.doc.getValue()
      }
      return ''
    },
    setContent (value) {
      if (this.$instance) {
        const editor = this.$instance
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
        this.setContent(await this.$yaml.dump(value))
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
    }
  },
  async mounted () {
    if (this.animateOnAppear) {
      this.animateExpansion()
    }

    this.createInstance(this.$refs.container)
    this.update(this.value)
    this.refresh()

    const shootSchemaDefinition = await getShootSchemaDefinition()
    const shootProperties = get(shootSchemaDefinition, 'properties', {})
    const indentUnit = get(this.$instance, 'options.indentUnit', 2)
    this.shootEditorCompletions = new ShootEditorCompletions(shootProperties, indentUnit, this.completionPaths)
  },
  watch: {
    canPatchShoots (value) {
      this.$instance.setOption('readOnly', this.isReadOnly)
    },
    shootPurpose (value) {
      this.$instance.setOption('readOnly', this.isReadOnly)
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
      }
    },
    theme (value) {
      this.$instance.setOption('theme', value)
    }
  },
  beforeUnmount () {
    this.destroyInstance()
  }
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
  @use '@/sass/main.scss' as *;

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
