<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <popper
    :key="popperKey"
    ref="popper"
    trigger="click"
    :options="popperOptions"
    :boundaries-selector="boundariesSelector"
    :disabled="disabled"
    @show="onPopperShow"
    @hide="onPopperHide"
    >
    <div class="popper">
      <v-card class="inner-card">
        <v-toolbar ref="toolbar" :height="30" :color="toolbarColor" dark flat>
          <v-toolbar-title class="subtitle-1">{{title}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn small icon @click.native.stop="closePopover">
            <v-icon color="white" class="subtitle-1">mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <slot></slot>
        </v-card-text>
      </v-card>
    </div>
    <!-- Using old slot syntax. Corresponding issue: https://github.com/RobinCK/vue-popper/issues/88 -->
    <template slot="reference">
      <slot name="popperRef"></slot>
    </template>
  </popper>
</template>

<script>
import Popper from 'vue-popperjs'
import { closePopover } from '@/utils'
import 'vue-popperjs/dist/vue-popper.css'

export default {
  components: {
    Popper
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
    placement: {
      type: String,
      default: 'top'
    },
    disabled: {
      type: Boolean
    },
    boundariesSelector: {
      type: String,
      default: '.v-main__wrap'
    }
  },
  computed: {
    popperOptions () {
      const options = {
        placement: this.placement,
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
    },
    emitRendered () {
      this.$emit('rendered')
    },
    onPopperShow () {
      this.$emit('input', true)
    },
    onPopperHide () {
      this.$emit('input', false)
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

<style lang="scss" scoped>

  .popper {
    padding: 0px;
    border-radius: 0px;
    z-index: 7;
    border: 0px !important;
    background-color: transparent !important;
    -webkit-box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12);
    box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12);
  }

  .inner-card {
    max-width: 1000px;
    max-height: 85vh;
    overflow-y: scroll;
  }

  ::v-deep .v-toolbar__content {
    padding: 0px 16px;
  }

</style>
