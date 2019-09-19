<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-layout column fill-height class="position-relative">
    <v-flex v-if="!clean && !!modificationWarning" class="shrink">
      <v-alert :value="modificationWarning" @input="onDismissModificationWarning" type="warning" dismissible color="cyan darken-2" transition="slide-y-transition" class="ma-0">
        <slot name="modificationWarning"></slot>
      </v-alert>
    </v-flex>
    <v-flex ref="container" :style="containerStyles"></v-flex>
    <v-flex v-if="errorMessageInternal" class="shrink">
      <g-alert color="error" :message.sync="errorMessageInternal" :detailedMessage.sync="detailedErrorMessageInternal"></g-alert>
    </v-flex>
    <v-flex :style="toolbarStyles">
      <v-layout row align-center justify-space-between fill-height>
        <slot name="toolbarItemsLeft"></slot>
        <v-flex d-flex class="divider-right">
          <v-tooltip top>
            <v-btn icon slot="activator" :disabled="untouched" @click="reload">
              <v-icon small>mdi-reload</v-icon>
            </v-btn>
            <span>Discard and Reload</span>
          </v-tooltip>
        </v-flex>
        <v-flex d-flex class="divider-right">
          <v-tooltip top>
            <v-btn icon slot="activator" :disabled="!historySize.undo" @click="undo">
              <v-icon small>mdi-undo</v-icon>
            </v-btn>
            <span>Undo</span>
          </v-tooltip>
          <v-tooltip top>
            <v-btn icon slot="activator" :disabled="!historySize.redo" @click="redo">
              <v-icon small>mdi-redo</v-icon>
            </v-btn>
            <span>Redo</span>
          </v-tooltip>
        </v-flex>
        <v-flex d-flex>
          <v-tooltip top>
            <v-btn icon slot="activator" @click="downloadContent">
              <v-icon small>mdi-download</v-icon>
            </v-btn>
            <span>Download</span>
          </v-tooltip>
        </v-flex >
        <v-flex d-flex class="divider-right">
          <copy-btn
            :clipboard-text="getContent()"
            @click.native.stop="focus"
            tooltip-text='Copy'
            :user-feedback="false"
            @copy="onCopy"
            @copyFailed="onCopyFailed"
          >
          </copy-btn>
        </v-flex>
        <v-flex d-flex xs12></v-flex>
        <slot name="toolbarItemsRight"></slot>
      </v-layout>
    </v-flex>
    <v-snackbar v-model="snackbar" top absolute :color="snackbarColor" :timeout="snackbarTimeout">
      {{ snackbarText }}
    </v-snackbar>
  </v-layout>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import GAlert from '@/components/GAlert'
import { mapState } from 'vuex'
import { getProjectName } from '@/utils'
import download from 'downloadjs'

// codemirror
import CodeMirror from 'codemirror'
import 'codemirror/mode/yaml/yaml.js'
import 'codemirror/lib/codemirror.css'

// lodash
import isEqual from 'lodash/isEqual'
import get from 'lodash/get'
import omit from 'lodash/omit'
import cloneDeep from 'lodash/cloneDeep'
import assign from 'lodash/assign'

// js-yaml
import jsyaml from 'js-yaml'

function safeDump (value) {
  return jsyaml.safeDump(value, {
    skipInvalid: true
  })
}

export default {
  components: {
    CopyBtn,
    GAlert
  },
  name: 'shoot-item-editor',
  props: {
    shootContent: {
      type: Object
    },
    modificationWarning: {
      type: Boolean
    },
    errorMessage: {
      type: String
    },
    detailedErrorMessage: {
      type: String
    },
    extraKeys: {
      type: Object
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
      toolbarHeight: 48
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    value () {
      const data = cloneDeep(this.shootContent)
      if (data) {
        return omit(data, ['info'])
      }
      return undefined
    },
    containerStyles () {
      return {
        height: `${this.lineHeight * 15}px`,
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
        this.$emit('update:errorMessage', value)
      }
    },
    detailedErrorMessageInternal: {
      get () {
        return this.detailedErrorMessage
      },
      set (value) {
        this.$emit('update:detailedErrorMessage', value)
      }
    }
  },
  methods: {
    getQualifiedName () {
      const name = get(this, 'value.metadata.name', 'unnamed')
      const namespace = this.namespace
      const projectName = getProjectName({ namespace })
      return `shoot--${projectName}--${name}.yaml`
    },
    onDismissModificationWarning () {
      this.$emit('dismissModificationWarning')
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
      this.$emit('conflictPath', conflictPath)
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
      this.$nextTick(() => this.refreshInstance())
    },
    refreshInstance () {
      if (this.$instance) {
        this.$instance.refresh()
      }
    },
    createInstance (element) {
      const vm = this
      const extraKeys = assign ({}, {
        'Tab': (instance) => {
          if (instance.somethingSelected()) {
            instance.indentSelection('add')
          } else {
            instance.execCommand('insertSoftTab')
          }
        },
        'Shift-Tab': (instance) => {
          instance.indentSelection('subtract')
        }
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
        extraKeys
      }
      this.$instance = CodeMirror(element, options)
      this.$instance.setSize('100%', '100%')
      const onChange = ({ doc }) => {
        this.untouched = false
        this.setClean(doc.isClean(this.generation))
        this.historySize = doc.historySize()
        this.errorMessage = undefined
        this.detailedErrorMessage = undefined
      }
      this.$instance.on('change', onChange)
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
    update (value = this.value) {
      if (value) {
        this.setContent(safeDump(value))
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
    }
  },
  mounted () {
    this.createInstance(this.$refs.container)
    this.update(this.value)
    this.refresh()
  },
  watch: {
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
    }
  },
  beforeDestroy () {
    this.destroyInstance()
  }
}
</script>

<style lang="styl" scoped>
  .no-margin
    margin: 0 !important
  .position-relative
    position: relative !important
  .divider-
    &right
      border-right: 1px solid #efefef
    &left
      border-left: 1px solid #efefef
  >>> .cm-tab
     background: embedurl('../assets/tab.png')
     background-position: right
     background-repeat: no-repeat
</style>
