<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    ref="reference"
    class="g-reference"
  >
    <slot
      name="activator"
      v-bind="makeActivatorProps()"
    >
      <v-btn
        variant="text"
        text="Test"
        @click="toogle"
      />
    </slot>
  </div>
  <v-fade-transition>
    <div v-if="internalValue"
      ref="floating"
      class="g-floating"
      :style="floatingElementStyles"
    >
      <v-card
        ref="card"
        v-click-outside="close"
        density="compact"
        elevation="8"
        rounded
      >
        <v-toolbar
          ref="toolbar"
          color="primary"
          height="32"
        >
          <template #prepend>
            <v-icon icon="mdi-help" size="x-small"/>
          </template>
          <template #title>
            <span class="text-subtitle-1">Lorem ipsum</span>
          </template>
          <template #append>
            <v-btn
              variant="text"
              density="comfortable"
              icon="mdi-close"
              size="small"
              @click.prevent.stop="close"
            >
            </v-btn>
          </template>
        </v-toolbar>
        <v-card-text >
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr,
          sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
          At vero eos et accusam et justo duo dolores et ea rebum.
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr,
          sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
          At vero eos et accusam et justo duo dolores et ea rebum.
          Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
        </v-card-text>
      </v-card>
      <div
        ref="floatingArrow"
        class="g-floating__arrow elevation-8"
        :style="floatingArrowStyles"
      />
    </div>
  </v-fade-transition>

</template>
<!-- eslint-disable no-unused-vars -->

<script setup>
import { ref, computed, toRef, unref, onUnmounted } from 'vue'
import { useEventBus } from '@vueuse/core'
import {
  useFloating,
  offset,
  flip,
  shift,
  size,
  arrow,
  hide,
  autoUpdate,
} from '@floating-ui/vue'

const ARROW_SIZE = 10

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  placement: {
    type: String,
    default: 'bottom',
  },
  boundary: {
    type: [String, Object],
    default: 'main > .g-main__wrap',
  },
})

const lazyValue = ref(props.modelValue)
const reference = ref(null)
const floating = ref(null)
const floatingArrow = ref(null)
const toolbar = ref(null)
const card = ref(null)
const maxWidth = ref('100vw')
const maxHeight = ref('100vh')

const emit = defineEmits([
  'update:modelValue',
])

const initialPlacement = toRef(props, 'placement')

const internalValue = computed({
  get () {
    return lazyValue.value
  },
  set (value) {
    lazyValue.value = value
    emit('update:modelValue', value)
  },
})

function close () {
  internalValue.value = false
}

function toogle () {
  internalValue.value = !internalValue.value
}

function unwrapElement (value) {
  const element = unref(value)
  return element?.$el ?? element
}

function makeActivatorProps () {
  const props = {
    onClick () {
      toogle()
    },
  }
  return {
    props,
  }
}

function makeDetectOverflowOptions () {
  const boundary = toRef(props, 'boundary')
  return {
    padding: 12,
    get boundary () {
      return typeof boundary.value === 'string'
        ? document.querySelector(boundary.value)
        : boundary.value
    },
  }
}

function makeShiftOptions () {
  const detectOverflowOptions = makeDetectOverflowOptions()
  const shiftOptions = {}
  return Object.assign(detectOverflowOptions, shiftOptions)
}

function makeFlipOptions () {
  const detectOverflowOptions = makeDetectOverflowOptions()
  const flipOptions = {}
  return Object.assign(detectOverflowOptions, flipOptions)
}

function makeSizeOptions () {
  const detectOverflowOptions = makeDetectOverflowOptions()
  const sizeOptions = {
    apply ({ availableWidth, availableHeight, ...state }) {
      maxHeight.value = `${availableHeight}px`
      maxWidth.value = `${availableWidth}px`
    },
  }
  return Object.assign(detectOverflowOptions, sizeOptions)
}

function makeHideOptions () {
  const detectOverflowOptions = makeDetectOverflowOptions()
  const hideOptions = {}
  return Object.assign(detectOverflowOptions, hideOptions)
}

const {
  x,
  y,
  strategy,
  placement: finalPlacement,
  middlewareData,
  isPositioned,
  floatingStyles,
} = useFloating(reference, floating, {
  placement: initialPlacement,
  strategy: 'fixed',
  open: internalValue,
  whileElementsMounted (...args) {
    return autoUpdate(...args, {
      animationFrame: true,
    })
  },
  middleware: [
    offset(ARROW_SIZE),
    shift(makeShiftOptions()),
    flip(makeFlipOptions()),
    size(makeSizeOptions()),
    arrow({
      element: floatingArrow,
    }),
    hide(makeHideOptions()),
  ],
})

const floatingElementStyles = computed(() => {
  const styles = {
    ...unref(floatingStyles),
    maxWidth: maxWidth.value,
    maxHeight: maxHeight.value,
  }
  return styles
})

const floatingArrowStyles = computed(() => {
  const {
    x,
    y,
  } = middlewareData.value.arrow ?? {}

  const side = finalPlacement.value.split('-')[0]
  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[side]

  const element = finalPlacement.value === 'bottom'
    ? unwrapElement(toolbar)
    : unwrapElement(card)

  const backgroundColor = element
    ? getComputedStyle(element)['background-color']
    : undefined

  return {
    '--left-offset': '0px',
    '--top-offset': '0px',
    '--size': `${ARROW_SIZE}px`,
    backgroundColor,
    left: x !== null ? `calc(${x}px - var(--left-offset))` : null,
    top: y !== null ? `calc(${y}px - var(--top-offset))` : null,
    [staticSide]: 'calc(var(--size) / -2)',
  }
})

const unsubscribe = useEventBus('esc-pressed').on(close)

onUnmounted(() => {
  unsubscribe()
})
</script>

<style lang="scss" scoped>
  .g-reference {
    block-size: fit-content !important;
    width: fit-content !important;
    height: fit-content !important;
  }

  .g-floating {
    width: max-content !important;
    z-index: 1003;
    top: 0;
    left: 0;
    padding: 0px;
    margin: 0px;
  }

  .g-floating__arrow {
    position: absolute;
    z-index: -1;
    width: var(--size);
    height: var(--size);
    pointer-events: none;
    transform: rotate(45deg);
  }
</style>
