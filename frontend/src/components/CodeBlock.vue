<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="code-block" :data-lang="lang">
    <div class="code-block-wrapper" :style="{ 'max-height': height }">
      <pre><code :class="lang" ref="block"></code></pre>
      <span class="copied" :class="{ 'active': showMessage }">Copied!</span>
    </div>
    <copy-btn
      v-if="showCopyButton"
      class="copy-button"
      :clipboard-text="content"
      @copy="onCopy"
      :user-feedback="false"
    ></copy-btn>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import trim from 'lodash/trim'
import split from 'lodash/split'
import replace from 'lodash/replace'
import hljs from 'highlight.js/lib/highlight.js'

import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'
import yaml from 'highlight.js/lib/languages/yaml'

import 'highlight.js/styles/docco.css'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('yaml', yaml)

export default {
  components: {
    CopyBtn
  },
  props: {
    lang: String,
    height: {
      type: [Number, String],
      default: '450px'
    },
    content: {
      type: String,
      default: ''
    },
    showCopyButton: {
      type: Boolean,
      default: true
    }

  },
  data: () => ({
    showMessage: false,
    clipboard: undefined
  }),
  methods: {
    prettyPrint (textContent) {
      const block = this.$refs.block
      if (textContent) {
        block.textContent = textContent
      }
      let lines = split(block.textContent, '\n')
      let matches
      if (lines[0] === '') {
        lines.shift()
      }
      const indentation = (matches = (/^[\s\t]+/).exec(lines[0])) !== null ? matches[0] : null
      if (indentation) {
        lines = lines.map(line => {
          line = replace(line, indentation, '')
          line = replace(line, /\t/g, '  ')
          return line
        })
        block.textContent = trim(lines.join('\n'))
      }
      hljs.highlightBlock(block)
      this.$emit('highlightBlock')
    },
    onCopy () {
      this.showMessage = true
      window.setTimeout(() => {
        this.showMessage = false
      }, 2000)
    }
  },
  mounted () {
    this.prettyPrint(this.content)
  },
  watch: {
    content (textContent) {
      this.prettyPrint(textContent)
    }
  }
}
</script>

<style lang="scss" scoped>
  @import '~vuetify/src/styles/styles.sass';

  $grey-lighten-5: map-get($grey, 'lighten-5');

  .code-block {
    overflow: hidden;
    position: relative;
    border-radius: 2px;
    background-color: $grey-lighten-5;
    color: $grey-lighten-5;
    font-family: "Operator Mono", "Fira Code", Menlo, Hack, "Roboto Mono", "Liberation Mono", Monaco, monospace;
    font-size: 14px;
    line-height: 1.4em;
    + .code-block {
      margin-top: 24px;
    }
    &:hover {
      &:after {
        opacity: 0;
      }
      .copy-button {
        opacity: 1;
      }
    }
    &:after {
      position: absolute;
      top: 20px;
      right: 30px;
      transition: $swift-ease-out;
      color: rgba(#000, .26);
      font-family: Roboto, sans-serif;
      font-size: 11px;
      line-height: 1em;
    }
    &[data-lang="javascript"]:after {
      content: 'Javascript';
    }
    &[data-lang="yaml"]:after {
      content: 'YAML';
    }
    &[data-lang="json"]:after {
      content: 'JSON';
    }
    &[data-lang="bash"]:after {
      content: 'Shell';
    }
    pre {
      margin: 0;
      white-space: pre;
    }
    code.hljs {
      padding: 0;
      white-space: pre !important;
      color: initial;
      background-color: initial;
      font-weight: normal;
      box-shadow: none;
      -webkit-box-shadow: none;
      &:before {
        content: none;
      }
    }
  }
  .code-block-wrapper {
    min-width: 100%;
    max-height: 450px;
    padding: 16px;
    overflow: auto;
  }
  .copy-button {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    opacity: 0;
    transition: $swift-ease-out;
  }
  .copied {
    padding: 8px 16px;
    position: absolute;
    top: 14px;
    left: 14px;
    background-color: rgba(#000, .87);
    border-radius: 2px;
    transform: translate3d(0, -48px, 0);
    transition: $swift-ease-in-out;
    color: #fff;
    font-family: $font-roboto;
    font-size: 14px;
    line-height: 1em;
    &.active {
      transition: $swift-ease-out;
      transform: translate3d(0, 0, 0);
    }
  }
</style>
