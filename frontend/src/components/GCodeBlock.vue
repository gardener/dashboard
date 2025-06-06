<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="code-block"
    :data-lang="lang"
  >
    <div
      class="code-block-wrapper"
      :style="{ 'max-height': maxHeight, 'min-width': minWidth }"
    >
      <pre><code
          ref="block"
          :class="lang"
      /></pre>
      <span
        class="copied"
        :class="{ 'active': showMessage }"
      >Copied!</span>
    </div>
    <g-copy-btn
      v-if="showCopyButton"
      class="copy-button"
      :clipboard-text="clipboardText"
      :user-feedback="false"
      @copy="onCopy"
    />
  </div>
</template>

<script>
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'
import yaml from 'highlight.js/lib/languages/yaml'

import GCopyBtn from '@/components/GCopyBtn.vue'

import trim from 'lodash/trim'
import split from 'lodash/split'
import replace from 'lodash/replace'

import 'highlight.js/styles/docco.css'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('yaml', yaml)

export default {
  components: {
    GCopyBtn,
  },
  props: {
    lang: String,
    maxHeight: {
      type: [Number, String],
      default: '450px',
    },
    minWidth: {
      type: [Number, String],
      default: '100%',
    },

    content: {
      type: String,
      default: '',
    },
    clipboard: {
      type: String,
      default: '',
    },
    showCopyButton: {
      type: Boolean,
      default: true,
    },
  },
  emits: [
    'highlightBlock',
  ],
  data: () => ({
    showMessage: false,
  }),
  computed: {
    clipboardText () {
      return this.clipboard ? this.clipboard : this.content
    },
  },
  watch: {
    content (textContent) {
      this.prettyPrint(textContent)
    },
  },
  mounted () {
    this.prettyPrint(this.content)
  },
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
      hljs.highlightElement(block)
      this.$emit('highlightBlock')
    },
    onCopy () {
      this.showMessage = true
      window.setTimeout(() => {
        this.showMessage = false
      }, 2000)
    },
  },
}
</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

  /** Transitions - Based on Angular Material **/
  $swift-ease-out-duration: .4s !default;
  $swift-ease-out-timing-function: cubic-bezier(.25, .8, .25, 1) !default;
  $swift-ease-out: all $swift-ease-out-duration $swift-ease-out-timing-function !default;

  $swift-ease-in-duration: .3s !default;
  $swift-ease-in-timing-function: cubic-bezier(.55, 0, .55, .2) !default;
  $swift-ease-in: all $swift-ease-in-duration $swift-ease-in-timing-function !default;

  $swift-ease-in-out-duration: .5s !default;
  $swift-ease-in-out-timing-function: cubic-bezier(.35, 0, .25, 1) !default;
  $swift-ease-in-out: all $swift-ease-in-out-duration $swift-ease-in-out-timing-function !default;

  .code-block {
    overflow: hidden;
    position: relative;
    border-radius: 2px;
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
    border-radius: 2px;
    transform: translate3d(0, -48px, 0);
    transition: $swift-ease-in-out;
    font-family: Roboto, sans-serif;
    font-size: 14px;
    line-height: 1em;

    &.active {
      transition: $swift-ease-out;
      transform: translate3d(0, 0, 0);
    }
  }

  .v-theme--light {
    .code-block {
      background-color: rgba(0, 0, 0, .02);
    }

    .copied {
      background-color: rgba(0, 0, 0, .87);
      color: #fff;
    }
  }

  .v-theme--dark {
    .code-block {
      background-color: rgba(0, 0, 0, .2);

      &:after {
        color: rgba(#fff, .26) !important;
      }

      code.hljs {
        color: map.get(vuetify.$grey, 'lighten-4') !important;
      }
    }

    .copied {
      background-color: rgba(255, 255, 255, .87);
      color: #000;
    }
  }
</style>
