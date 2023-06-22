<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dropdown
    ref="popoverRef"
    prevent-overflow
    auto-boundary-max-size
    :boundary="boundaryElement"
    :overflow-padding="8"
    :disabled="disabled"
    :placement="placement"
    class="g-popover"
    @update:shown="onUpdateShown"
  >
    <template v-slot:default="{ shown, show, hide }">
      <slot
        name="activator"
        v-bind="{
          shown,
          show,
          hide,
          props: {
            onClick: () => shown ? hide() : show(),
          },
        }"
      />
    </template>
    <template v-slot:popper="{ hide }">
      <v-theme-provider :theme="themeName" with-background>
      <v-card
        variant="text"
        class="g-popover__card"
      >
        <v-toolbar v-if="toolbarTitle"
          :height="toolbarHeight"
          :color="toolbarColor"
        >
          <template v-slot:title >
            <span class="text-subtitle-1">
              {{ toolbarTitle }}
            </span>
          </template>
          <template v-slot:append>
            <v-btn
              density="comfortable"
              variant="text"
              size="small"
              icon="mdi-close"
              :color="toolbarColor"
              @click.stop="hide()"
            />
          </template>
        </v-toolbar>
        <v-card-item v-if="$slots.item"
          v-bind="containerProps"
        >
          <slot name="item"/>
        </v-card-item>
        <v-card-text v-else-if="$slots.text"
          v-bind="containerProps"
        >
          <slot name="text"/>
        </v-card-text>
        <slot v-else/>
      </v-card>
      </v-theme-provider>
    </template>
  </v-dropdown>
</template>

<script>
import { defineComponent } from 'vue'
import { useTheme } from 'vuetify'

export default defineComponent({
  setup () {
    const theme = useTheme()
    return {
      themeName: theme.global.name,
    }
  },
  inject: ['mainContainer'],
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    placement: {
      type: String,
      default: 'top',
    },
    boundary: {
      type: [String, Object],
    },
    toolbarTitle: {
      type: String,
      default: '',
    },
    toolbarColor: {
      type: String,
      default: 'primary',
    },
    toolbarHeight: {
      type: Number,
      default: 32,
    },
    containerProps: {
      type: Object,
      default: null,
    },
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
  },
  emits: [
    'update:visible',
  ],
  methods: {
    onUpdateShown (value) {
      this.$emit('update:visible', value)
    },
  },
})
</script>

<style lang="scss" scoped>
  .g-popover {
    width: fit-content !important;
  }

  .g-popover__card {
    width: fit-content;
    max-width: 1024px;
    max-height: 80%;
    overflow-y: hidden !important;
  }
</style>
