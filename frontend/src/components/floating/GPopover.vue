<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <Dropdown
    ref="popoverRef"
    v-model:shown="shown"
    prevent-overflow
    auto-boundary-max-size
    :boundary="boundaryElement"
    :distance="distance"
    :overflow-padding="8"
    :disabled="disabled"
    :placement="placement"
    :content-style="{
      '--g-popper-title-color': `var(--v-theme-${toolbarColor})`,
      '--g-popper-color': `var(--v-theme-${color})`,
      '--g-popper-z-index': zIndex,
    }"
  >
    <template #default="popperProps">
      <slot
        name="activator"
        v-bind="makeActivatorProps(popperProps)"
      />
    </template>
    <template #popper="{ hide }">
      <v-card
        variant="flat"
      >
        <v-toolbar
          v-if="toolbarTitle"
          absolute
          :height="toolbarHeight"
          :color="toolbarColor"
        >
          <template #title>
            <span class="text-subtitle-1 pr-6">
              <slot name="toolbar-title">
                {{ toolbarTitle }}
              </slot>
            </span>
          </template>
          <template #append>
            <v-btn
              variant="text"
              density="comfortable"
              size="small"
              icon="mdi-close"
              @click.stop.prevent="hide()"
            />
          </template>
        </v-toolbar>
        <div
          role="content"
          :class="contentClass"
        >
          <slot />
          <v-card-text
            v-if="$slots.text"
            :class="contentTextClass"
          >
            <slot name="text" />
          </v-card-text>
        </div>
      </v-card>
    </template>
  </Dropdown>
</template>

<script>
import { options } from 'floating-vue'

import PopperWrapper from './PopperWrapper.vue'

const Dropdown = {
  ...PopperWrapper,
  name: 'VDropdown',
  vPopperTheme: 'popover',
}

Object.assign(options.themes, {
  popover: {
    $extend: 'dropdown',
    $resetCss: true,
    placement: 'bottom',
    triggers: [],
    delay: 0,
  },
})

export default {
  components: {
    Dropdown,
  },
  inject: [
    'mainContainer',
  ],
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    placement: {
      type: String,
      default: 'top',
    },
    boundary: {
      type: [String, Element],
    },
    distance: {
      type: Number,
      default: 6,
    },
    toolbarTitle: {
      type: String,
      default: 'Test',
    },
    toolbarColor: {
      type: String,
      default: 'primary',
    },
    toolbarHeight: {
      type: Number,
      default: 30,
    },
    color: {
      type: String,
      default: 'surface',
    },
    zIndex: {
      type: [Number, String],
      default: 1003,
    },
    contentClass: {
      type: [Object, Array, String],
      default: null,
    },
    contentTextClass: {
      type: [Object, Array, String],
      default: null,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      lazyValue: this.modelValue,
    }
  },
  computed: {
    boundaryElement () {
      if (!this.boundary) {
        return this.mainContainer
      }
      if (typeof this.boundary === 'string') {
        const element = this.boundary.startsWith(':scope')
          ? this.mainContainer
          : document
        return element.querySelector(this.boundary)
      }
      return this.boundary
    },
    shown: {
      get () {
        return this.lazyValue
      },
      set (value) {
        if (this.lazyValue !== value) {
          this.lazyValue = value
          this.$emit('update:modelValue', this.lazyValue)
        }
      },
    },
  },
  watch: {
    modelValue (value) {
      if (this.lazyValue !== value) {
        this.lazyValue = value
      }
    },
  },
  methods: {
    makeActivatorProps ({ shown, show, hide }) {
      const props = {
        onClick () {
          if (!shown) {
            show()
          }
        },
      }
      return {
        shown,
        show,
        hide,
        props,
      }
    },
  },
}
</script>

<style lang="scss">
  .v-popper--theme-popover {
    .v-popper__inner {
      overflow-y: hidden;
      width: fit-content;
      border-radius: 5px;
      border: 0;

      .v-card {
        position: relative;
        max-width: 1024px;
        max-height: inherit;
        overflow-y: hidden;

        .v-toolbar--absolute {
          top: 0;
          z-index: 7;
        }

        > [role=content] {
          padding-top: 30px;
          max-height: inherit;
          max-width: inherit;
          overflow-y: scroll;
        }
      }
    }

    &.v-theme--light .v-popper__inner {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    &.v-theme--dark .v-popper__inner {
      box-shadow: 0 8px 24px rgba(97, 97, 97, 0.3);
    }

    &.v-popper__popper {
      z-index: var(--g-popper-z-index, 1003);

      .v-popper__arrow-outer {
        border-color: rgb(var(--g-popper-color, var(--v-theme-surface)));
      }

      &[data-popper-placement^=bottom] .v-popper__arrow-outer {
        border-color: rgb(var(--g-popper-title-color, var(--v-theme-primary)));
      }

      .v-popper__arrow-inner {
        visibility: hidden;
      }

    }
  }
</style>
