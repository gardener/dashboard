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
import { getShootSpec } from '@/utils/api'
import download from 'downloadjs'

// codemirror
import CodeMirror from 'codemirror'
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/mode/yaml/yaml.js'
import 'codemirror/lib/codemirror.css'

// lodash
import isEqual from 'lodash/isEqual'
import get from 'lodash/get'
import omit from 'lodash/omit'
import cloneDeep from 'lodash/cloneDeep'
import assign from 'lodash/assign'
import forIn from 'lodash/forIn'
import flatMap from 'lodash/flatMap'
import map from 'lodash/map'
import reverse from 'lodash/reverse'
import trim from 'lodash/trim'
import nth from 'lodash/nth'
import forEach from 'lodash/forEach'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import last from 'lodash/last'
import words from 'lodash/words'
import join from 'lodash/join'
import repeat from 'lodash/repeat'
import upperFirst from 'lodash/upperFirst'

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
      toolbarHeight: 48,
      shootCompletions: {}
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
      const extraKeys = assign({}, {
        'Tab': (instance) => {
          if (instance.somethingSelected()) {
            instance.indentSelection('add')
          } else {
            instance.execCommand('insertSoftTab')
          }
        },
        'Shift-Tab': (instance) => {
          instance.indentSelection('subtract')
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

      const yamlHint = (editor, options) => {
        const cur = editor.getCursor()
        const token = getYamlToken(editor, cur)

        var tprop = token
        var line = cur.line
        var context = []
        while (line > 0 && !(tprop.type === 'property' && tprop.indent === 0)) {
          tprop = getYamlToken(editor, CodeMirror.Pos(line, 0))
          if (tprop.indent < token.start &&
              (context.length === 0 || context[context.length - 1].indent > tprop.indent)) {
            if (tprop.type === 'property') {
              context.push(tprop)
            } else if (tprop.type === 'arrayStart') {
              context.push(tprop)
            }
          }
          line--
        }

        return {
          list: getCompletions(token, context, options),
          from: CodeMirror.Pos(cur.line, token.start),
          to: CodeMirror.Pos(cur.line, token.end)
        }
      }

      const getYamlToken = (editor, cur) => {
        var token
        var lineTokens = editor.getLineTokens(cur.line)
        const lineString = join(map(lineTokens, 'string'), '')
        forEach(lineTokens, lineToken => {
          let result = lineToken.string.match(/^(\s*)-\s(.*)?$/)
          if (result) {
            token = lineToken
            token.type = 'arrayStart'
            token.string = trim(last(words(lineString.substring(0, cur.ch).toLowerCase())))
            token.indent = token.start = result[1].length
            token.end = token.start + token.string.length + 2
            if (lineTokens.length >= 2 && lineTokens[lineTokens.length - 1].string === ':') {
              // arrayStart line can also start new object
              let result = lineTokens[lineTokens.length - 2].string.match(/^(\s*)(.+?)$/)
              token.propertyName = result[2]
            }
          }
        })
        if (!token) {
          if (lineTokens.length >= 2 && lineTokens[lineTokens.length - 1].string === ':') {
            token = lineTokens[lineTokens.length - 2]
            let result = token.string.match(/^(\s*)(.+?)$/)
            token.indent = token.start = result[1].length
            token.propertyName = result[2]
            token.type = 'property'
          }
        }
        if (!token) {
          token = editor.getTokenAt(cur, true)
          token.string = trim(last(words(lineString.substring(0, cur.ch).toLowerCase())))
          token.start = token.end - token.string.length
        }
        return token
      }

      const getCompletions = (token, context, options) => {
        const completionPath = flatMap(reverse(context), (pathToken, index, revContext) => {
          if (pathToken.type === 'property') {
            if (get(nth(revContext, index + 1), 'type') === 'arrayStart') {
              // next item is array, so don't append 'properties'
              return pathToken.propertyName
            }
            if (index === revContext.length - 1 && token.type === 'arrayStart') {
              // current token is array, so list properties of its items
              return [pathToken.propertyName, 'items', 'properties']
            }
            // normal property token
            return [pathToken.propertyName, 'properties']
          } else if (pathToken.type === 'arrayStart') {
            if (pathToken.propertyName !== undefined && token.start === pathToken.indent + (this.$instance.options.indentUnit * 2)) {
              // arrayStart line can also start new object, so list properties of specific item
              return ['items', 'properties', pathToken.propertyName, 'properties']
            }
            // path token is array, so list properties of its items
            return ['items', 'properties']
          } else {
            return []
          }
        })

        let completions
        if (completionPath.length > 0) {
          completions = get(this.shootCompletions, completionPath)
        } else {
          completions = this.shootCompletions
        }

        let completionArray = []
        const generateCompletionText = (key, type) => {
          const completionIndentStr = `${repeat(' ', token.start)}${repeat(' ', this.$instance.options.indentUnit)}`
          if (type === 'array') {
            return `${key}:\n${completionIndentStr}- `
          } else if (type === 'object') {
            return `${key}:\n${completionIndentStr}`
          } else {
            return `${key}: `
          }
        }
        forIn(completions, (value, key) => {
          const text = `${token.type === 'arrayStart' ? '- ' : ''}${generateCompletionText(key, value.type)}`
          completionArray.push({
            text,
            displayText: `${key} [${value.type}] - ${value.description}`,
            render: (el, self, data) => {
              const propertyWrapper = document.createElement('div')
              propertyWrapper.innerHTML = `<span class="property">${key}</span><span class="type">${upperFirst(value.type)}</span>`
              propertyWrapper.className = 'ghint-type'
              el.appendChild(propertyWrapper)

              const descWrapper = document.createElement('div')
              descWrapper.innerHTML = `<span class="description">${value.description}</span>`
              descWrapper.className = 'ghint-desc'
              el.appendChild(descWrapper)
            }
          })
        })
        if (trim(token.string).length > 0) {
          completionArray = filter(completionArray, completion => {
            return includes(completion.text.toLowerCase(), token.string)
          })
        }
        return completionArray
      }

      CodeMirror.registerHelper('hint', 'yaml', yamlHint)
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
  async mounted () {
    this.createInstance(this.$refs.container)
    this.update(this.value)
    this.refresh()
    const shootCompletions = await getShootSpec()
    this.shootCompletions = get(shootCompletions, 'data.spec.properties', {})
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
<style lang="styl">
  @import '~vuetify/src/stylus/settings/_colors.styl';

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
      color: $grey.darken-3;
    }
  }

  .CodeMirror-hint-active {
    background-color: $grey.lighten-4 !important;
  }

</style>
