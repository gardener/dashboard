<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-flex v-if="!clean && modificationWarning" class="shrink">
      <v-alert :value="modificationWarning" @input="dismissModificationWarning" type="warning" dismissible color="cyan darken-2" transition="slide-y-transition" class="ma-0">
        By modifying the resource directly you may cause serious problems in your cluster.
        We cannot guarantee that you can solve problems that result from using Cluster Editor incorrectly.
      </v-alert>
    </v-flex>
    <v-flex ref="container" :style="containerStyles"></v-flex>
    <v-flex v-if="alert" class="shrink">
      <v-alert v-model="alert" :type="alertType" dismissible transition="reverse-slide-y-transition" class="ma-0">
        {{alertMessage}}
      </v-alert>
    </v-flex>
    <v-flex :style="toolbarStyles">
      <v-layout row align-center justify-space-between fill-height>
        <v-flex d-flex class="divider-right">
          <v-tooltip top>
            <v-btn icon slot="activator" :disabled="clean" @click="save">
              <v-icon small>mdi-content-save</v-icon>
            </v-btn>
            <span>Save</span>
          </v-tooltip>
        </v-flex>
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
          <v-tooltip top>
            <v-btn icon slot="activator" ref="btnCopy">
              <v-icon small>content_copy</v-icon>
            </v-btn>
            <span>Copy</span>
          </v-tooltip>
        </v-flex>
        <v-flex d-flex xs12>
        </v-flex>
        <v-flex d-flex fill-height align-center class="divider-left">
          <v-tooltip top :color="hasConflict ? 'error' : ''">
            <div slot="activator" class="px-3 py-2">
            <v-icon :class="hasConflict ? 'error--text' : 'success--text'">
              {{hasConflict ? 'mdi-alert-circle' : 'mdi-check-circle'}}
            </v-icon>
            </div>
            <span v-if="hasConflict">Cluster resource has been modified<br>by another user or process</span>
            <span v-else>Cluster resource can be saved<br>without any conflicts</span>
          </v-tooltip>
        </v-flex>
      </v-layout>
    </v-flex>
    <v-snackbar v-model="snackbar" top absolute :color="snackbarColor" :timeout="snackbarTimeout">
      {{ snackbarText }}
    </v-snackbar>
    <v-dialog v-model="dialog" persistent scrollable max-width="360px" @keydown.esc="resolveAction(false)">
      <v-card>
        <v-card-title primary-title class="orange darken-2 grey--text text--lighten-4 headline" v-text="action.title"></v-card-title>
        <v-divider></v-divider>
        <v-card-text style="height: 80px;" v-html="action.text"></v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn flat @click="resolveAction(false)" color="primary">{{action.noButtonText}}</v-btn>
          <v-btn flat @click="resolveAction(true)" color="secondary">{{action.yesButtonText}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-layout>
</template>

<script>
import { mapGetters } from 'vuex'
import { replaceShoot } from '@/utils/api'
import Clipboard from 'clipboard'
import download from 'downloadjs'

// codemirror
import CodeMirror from 'codemirror'
import 'codemirror/mode/yaml/yaml.js'
import 'codemirror/lib/codemirror.css'

// lodash
import isEqual from 'lodash/isEqual'
import assign from 'lodash/assign'
import get from 'lodash/get'
import omit from 'lodash/omit'
import find from 'lodash/find'
import pick from 'lodash/pick'
import noop from 'lodash/noop'
import replace from 'lodash/replace'
import isFunction from 'lodash/isFunction'

// js-yaml
import jsyaml from 'js-yaml'

function safeDump (value) {
  return jsyaml.safeDump(value, {
    skipInvalid: true
  })
}

export default {
  name: 'shoot-item-editor',
  data () {
    return {
      conflictPath: null,
      modificationWarning: true,
      alert: false,
      alertMessage: '',
      alertType: 'error',
      snackbar: false,
      dialog: false,
      action: {
        id: '',
        title: '',
        text: '',
        yesButtonText: '',
        noButtonText: '',
        resolve: noop
      },
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
    ...mapGetters([
      'projectList',
      'shootByNamespaceAndName'
    ]),
    value () {
      const data = this.shootByNamespaceAndName(this.$route.params)
      if (data) {
        return omit(data, ['info'])
      }
    },
    containerStyles () {
      return {
        height: `${this.lineHeight * 15}px`,
        minHeight: `${this.lineHeight * 3}px`
      }
    },
    hasConflict () {
      return !!this.conflictPath
    },
    toolbarStyles () {
      return {
        flex: '0 0 auto',
        height: `${this.toolbarHeight}px`,
        minHeight: `${this.toolbarHeight}px`
      }
    }
  },
  methods: {
    getQualifiedName () {
      const { metadata: { name, namespace } } = this.value
      const project = find(this.projectList, ['metadata.namespace', namespace])
      const projectName = project.name || replace(namespace, /^garden-/, '')
      return `shoot--${projectName}--${name}.yaml`
    },
    dismissModificationWarning () {
      this.modificationWarning = false
      this.$localStorage.setItem('showShootEditorWarning', 'false')
    },
    async save () {
      try {
        if (this.untouched) {
          return
        }
        if (this.clean) {
          return this.clearHistory()
        }
        if (this.hasConflict && !(await this.confirmOverwrite())) {
          return
        }
        const paths = ['spec', 'metadata.labels', 'metadata.annotations']
        const data = pick(jsyaml.safeLoad(this.getContent()), paths)
        const user = this.$store.state.user
        const { metadata: { namespace, name } } = this.value
        const { data: value } = await replaceShoot({ namespace, name, user, data })
        this.update(value)
        this.snackbarColor = 'success'
        this.snackbarText = `Cluster specification has been successfully updated`
        this.snackbar = true
      } catch (err) {
        this.alert = true
        this.alertType = 'error'
        this.alertMessage = get(err, 'response.data.message', err.message)
      }
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
      const extraKeys = {
        'Ctrl-S' (instance) {
          vm.save()
        },
        'Cmd-S' (instance) {
          vm.save()
        },
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
      }
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
        extraKeys
      }
      this.$instance = CodeMirror(element, options)
      this.$instance.setSize('100%', '100%')
      const onChange = ({ doc }) => {
        this.untouched = false
        this.clean = doc.isClean(this.generation)
        this.historySize = doc.historySize()
        this.alert = false
        this.alertMessage = ''
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
        this.clean = true
        this.untouched = true
        this.conflictPath = null
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
        editor.scrollTo(left, top)
        editor.focus()
        if (cursor) {
          doc.setCursor(cursor)
        }
        this.clearHistory()
      }
    },
    update (value = this.value) {
      if (value) {
        this.setContent(safeDump(value))
      }
    },
    resolveAction (value) {
      this.dialog = false
      if (isFunction(this.action.resolve)) {
        const resolve = this.action.resolve
        this.action.resolve = undefined
        resolve(value)
      }
    },
    confirmNavigation () {
      this.dialog = true
      return new Promise(resolve => {
        assign(this.action, {
          id: 'navigation',
          title: 'Confirm Navigation',
          text: 'Your changes have not been saved.<br/>Are you sure you want to leave this page?',
          yesButtonText: 'Leave',
          noButtonText: 'Stay',
          resolve
        })
      })
    },
    confirmOverwrite () {
      this.dialog = true
      return new Promise(resolve => {
        assign(this.action, {
          id: 'save',
          title: 'Confirm Overwrite',
          text: 'Meanwhile another user or process has changed the cluster resource.<br/>Are you sure you want to overwrite it?',
          yesButtonText: 'Save',
          noButtonText: 'Cancel',
          resolve
        })
      })
    }
  },
  mounted () {
    const value = this.$localStorage.getItem('showShootEditorWarning')
    this.modificationWarning = value === null || value === 'true'
    this.createInstance(this.$refs.container)
    this.update(this.value)
    this.refresh()
    // clipboard
    const vm = this
    const clipboard = new Clipboard(vm.$refs.btnCopy.$el, {
      text () {
        return vm.getContent()
      }
    })
    clipboard.on('success', e => {
      this.snackbarColor = undefined
      this.snackbarText = 'Copied content to clipboard'
      this.snackbar = true
      e.clearSelection()
      this.focus()
    })
    clipboard.on('error', e => {
      this.snackbarColor = 'error'
      this.snackbarText = 'Copy to clipboard failed'
      this.snackbar = true
    })
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
            this.conflictPath = path
            break
          }
        }
      }
    }
  },
  async beforeRouteLeave (to, from, next) {
    if (this.clean) {
      return next()
    }
    try {
      if (await this.confirmNavigation()) {
        next()
      } else {
        this.focus()
        next(false)
      }
    } catch (err) {
      next(err)
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
