<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <Popper
    ref="popper"
    v-slot="{
      popperId,
      isShown,
      shouldMountContent,
      skipTransition,
      autoHide,
      show,
      hide,
      handleResize,
      onResize,
      classes,
      result,
    }"
    v-bind="makePopperProps($attrs)"
    :theme="finalTheme"
    :target-nodes="getTargetNodes"
    :reference-node="getReferenceNode"
    :popper-node="getPopperNode"
  >
    <div
      ref="reference"
      v-bind="makeReferenceProps($attrs)"
      :class="[
        'v-popper',
        themeClass,
        {
          'v-popper--shown': isShown,
        },
      ]"
    >
      <slot
        :shown="isShown"
        :show="show"
        :hide="hide"
      />
      <PopperContent
        ref="popperContent"
        :popper-id="popperId"
        :theme="finalTheme"
        :shown="isShown"
        :mounted="shouldMountContent"
        :skip-transition="skipTransition"
        :auto-hide="autoHide"
        :handle-resize="handleResize"
        :result="result"
        :classes="classes"
        :class="`v-theme--${themeName}`"
        :style="contentStyle"
        @hide="hide"
        @resize="onResize"
      >
        <slot
          name="popper"
          :shown="isShown"
          :hide="hide"
        />
      </PopperContent>
    </div>
  </Popper>
</template>

<script>
import { useTheme } from 'vuetify'
import {
  Popper,
  PopperContent,
  PopperMethods,
  ThemeClass,
} from 'floating-vue'

import 'floating-vue/dist/style.css'

import omit from 'lodash/omit'
import pick from 'lodash/pick'

const referenceProps = ['class']

export default {
  name: 'VPopperWrapper',
  components: {
    Popper: Popper(),
    PopperContent,
  },
  mixins: [
    PopperMethods,
    ThemeClass('finalTheme'),
  ],
  inheritAttrs: false,
  props: {
    theme: {
      type: String,
      default: null,
    },
    contentStyle: {
      type: Object,
      default: null,
    },
  },
  setup () {
    const theme = useTheme()
    return {
      themeName: theme.global.name,
    }
  },
  computed: {
    finalTheme () {
      return this.theme ?? this.$options.vPopperTheme
    },
  },
  methods: {
    getTargetNodes () {
      return Array.from(this.$refs.reference.children)
        .filter(node => node !== this.$refs.popperContent.$el)
    },
    getReferenceNode () {
      return this.$refs.reference
    },
    getPopperNode () {
      return this.$refs.popperContent.$el
    },
    makePopperProps (attrs) {
      return omit(attrs, referenceProps)
    },
    makeReferenceProps (attrs) {
      return pick(attrs, referenceProps)
    },
  },
}
</script>

<style>
.v-popper {
  width: fit-content;
  min-width: min-content;
  max-width: max-content;
}
</style>
