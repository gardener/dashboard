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
  <popper
    :key="popperKey"
    ref="popper"
    trigger="click"
    :options="popperOptions"
    boundaries-selector=".application"
    >
    <div class="popper">
      <v-card>
        <v-toolbar ref="toolbar" :height="30" :color="toolbarColor" dark flat>
          <v-toolbar-title class="subheading">{{title}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn small icon @click.native.stop="closePopover">
            <v-icon class="subheading">close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <slot name="content-before"></slot>
          <pre class="message">{{message}}</pre>
          <slot name="content-after"></slot>
          <div v-if="!!time">
            <div class="timestamp grey--text">
              <template v-if="showPlaceholder">
                &nbsp;
              </template>
              <lazy-component @show="showPlaceholder=false">
                <time-ago :dateTime="time"></time-ago>
              </lazy-component>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
    <template slot="reference">
      <slot name="popperRef"></slot>
    </template>
  </popper>
</template>

<script>
  import Popper from 'vue-popperjs'
  import TimeAgo from '@/components/TimeAgo'
  import { closePopover } from '@/utils'
  import 'vue-popperjs/dist/css/vue-popper.css'
  import VueLazyload from 'vue-lazyload'
  import Vue from 'vue'

  Vue.use(VueLazyload, {
    lazyComponent: true
  })

  export default {
    components: {
      Popper,
      TimeAgo
    },
    props: {
      popperKey: {
        type: String,
        required: true
      },
      toolbarColor: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: false
      },
      time: {
        type: String
      }
    },
    data () {
      return {
        showPlaceholder: true
      }
    },
    computed: {
      popperOptions () {
        const options = {
          placement: 'top',
          modifiers: {
            customArrowStyles: {
              enabled: true,
              fn: this.customArrowStyles,
              order: 875 // needs to run beofre applyStyle modifier
            }
          }
        }
        return options
      }
    },
    methods: {
      closePopover () {
        closePopover(this.$refs.popper)
      },
      customArrowStyles (data) {
        if (data.placement === 'bottom') {
          const toolbar = this.$refs.toolbar
          const content = toolbar.$el
          const css = getComputedStyle(content, null)
          const toolbarColor = css['background-color']

          const borderColor = `transparent transparent ${toolbarColor} transparent`
          data.arrowStyles = Object.assign(data.arrowStyles, { borderColor })
        }
        return data
      }
    },
    created () {
      /*
       * listen on the global "esc-key" event to close all tooltips.
       * shorthand instead of click outside of the tooltip.
       */
      this.$bus.$on('esc-pressed', () => {
        this.closePopover()
      })
    }
  }
</script>

<style lang="styl" scoped>

  .popper {
    padding: 0px;
    border-radius: 0px;
    z-index: 42;
    border: 0px !important;
    background-color: transparent !important;
    -webkit-box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12);
    box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12);
  }

  .message {
    text-align: left;
    min-width: 250px;
    max-width: 800px;
    max-height: 150px;
    white-space: pre-wrap;
    overflow-y: auto;
  }

  .timestamp {
    text-align: right;
    font-size: 90%;
    margin-top: 1.2em;
  }

</style>
