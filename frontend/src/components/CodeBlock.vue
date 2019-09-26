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
import highlight from 'highlight.js/lib/highlight.js'
import highlightJSON from 'highlight.js/lib/languages/json'
import highlightYAML from 'highlight.js/lib/languages/yaml'
import highlightJavascript from 'highlight.js/lib/languages/javascript'
import highlightBash from 'highlight.js/lib/languages/bash'
highlight.registerLanguage('json', highlightJSON)
highlight.registerLanguage('yaml', highlightYAML)
highlight.registerLanguage('javascript', highlightJavascript)
highlight.registerLanguage('bash', highlightBash)
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
      highlight.highlightBlock(block)
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

<style lang="styl" scoped>
  @import '~vuetify/src/stylus/settings/_colors.styl';

  .code-block {
    overflow: hidden;
    position: relative;
    border-radius: 2px;
    background-color: $grey.lighten-3;
    color: $grey.lighten-3;
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
    code {
      padding: 0;
      background: none;
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
