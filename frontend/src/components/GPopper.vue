<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span ref="reference">
    <slot
      name="activator"
      :on="{
        'click': togglePopper
      }"
    />
  </span>
  <div
    ref="floating"
    :class="{
        floating: true,
        hidden: !isOpen,
      }"
    :style="floatingStyle"
  >
    <div
      ref="floatingArrow"
      :class="{
          floatingArrow: true,
          hidden: !isOpen,
        }"
      :style="floatingArrowStyle"
    />
    <v-card class="inner-card">
      <v-toolbar
        ref="toolbar"
        :height="30"
        :color="props.toolbarColor"
        flat
      >
        <v-toolbar-title class="text-subtitle-1 toolbar-title--text">
          {{ props.title }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          size="small"
          icon
          @click.stop="closePopper"
        >
          <v-icon
            color="toolbar-title"
            class="text-subtitle-1"
          >
            mdi-close
          </v-icon>
        </v-btn>
      </v-toolbar>
      <slot name="card" />
      <v-card-text v-if="$slots.default">
        <slot />
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { toRef, ref, unref, onBeforeUnmount, onMounted, inject, computed } from 'vue'
import { useFloating, autoUpdate, arrow, shift, autoPlacement, size, offset } from '@floating-ui/vue'
import useOnOutsidePress from '@/composables/useOnOutsidePress'

const ARROW_SIZE = 10 // px
const bus = inject('bus')

const props = defineProps({
  toolbarColor: {
    type: String,
    default: 'primary',
  },
  title: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    default: 'top',
  },
  boundariesSelector: {
    type: [String, Object],
    default: 'main',
  },
})

const emit = defineEmits([
  'input',
])

const reference = ref(null)
const floating = ref(null)
const floatingArrow = ref(null)
const toolbar = ref(null)
const isOpen = ref(false)
const maxWidth = ref(null)
const maxHeight = ref(null)

const closePopper = () => {
  isOpen.value = false
  emit('input', false)
}

const togglePopper = () => {
  isOpen.value = !isOpen.value
  emit('input', isOpen.value)
}

const clippingBoundaryEl = computed(() => {
  if (typeof props.boundariesSelector === 'string') {
    return document.querySelector(props.boundariesSelector)
  }
  return unref(props.boundariesSelector)
})

// The floating uis "size"-middleware does not accept a ref for the boundary.
// Attempt to make it reactive by providing a Proxy that returns the current computed value
// when it is accessed inside of the floating-ui library.
const sizeOptions = new Proxy({
  boundary: clippingBoundaryEl.value,
  apply ({ availableWidth, availableHeight }) {
    maxWidth.value = availableWidth
    maxHeight.value = availableHeight
  },
}, {
  get (target, prop) {
    return prop === 'boundary' ? clippingBoundaryEl.value : target[prop]
  },
})

const autoPlacementOptions = new Proxy({
  boundary: clippingBoundaryEl.value,
}, {
  get (target, prop) {
    return prop === 'boundary' ? clippingBoundaryEl.value : target[prop]
  },
})

const {
  x,
  y,
  strategy,
  middlewareData,
  placement: finalPlacement,
} = useFloating(reference, floating, {
  placement: toRef(props.placement), // preferred placement (if space available)
  strategy: 'fixed',
  open: isOpen,
  whileElementsMounted (...args) {
    return autoUpdate(...args, { animationFrame: true })
  },
  middleware: [
    offset(ARROW_SIZE + 5),
    shift(),
    autoPlacement(autoPlacementOptions),
    size(sizeOptions),
    arrow({
      element: floatingArrow,
    }),
  ],
})

const removeOnOutsidePress = useOnOutsidePress([floating, reference], () => {
  if (isOpen.value) {
    closePopper()
  }
})

const overflowOffsetVariables = computed(() => {
  const overflows = middlewareData.value?.autoPlacement?.overflows || []
  const overflow = overflows.find((o) => o.placement === finalPlacement.value)?.overflows
  const overflowStyles = {
    '--left-offset': '0px',
    '--top-offset': '0px',
  }
  if (overflow?.[1] && overflow[1] > 0) {
    if (['top', 'bottom'].includes(finalPlacement.value)) {
      overflowStyles['--left-offset'] = `${overflow[1]}px`
    } else {
      overflowStyles['--top-offset'] = `${overflow[1]}px`
    }
  }
  return overflowStyles
})

const floatingStyle = computed(() => {
  return {
    ...overflowOffsetVariables.value,
    position: strategy.value,
    left: `calc(${x.value ?? 0}px + var(--left-offset))`,
    top: `calc(${y.value ?? 0}px + var(--top-offset))`,
    maxWidth: maxWidth.value ? `${maxWidth.value}px` : '100vw',
    maxHeight: maxHeight.value ? `${maxHeight.value}px` : '100vh',
  }
})

const floatingArrowStyle = computed(() => {
  // examples on arrow positioning: https://codesandbox.io/s/mystifying-kare-ee3hmh?file=/index.html
  const { x, y } = {
    x: null,
    y: null,
    ...middlewareData.value.arrow,
  }

  const side = finalPlacement.value.split('-')[0]

  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[side]
  let backgroundColor
  if (finalPlacement.value === 'bottom' && toolbar.value?.$el) {
    const css = getComputedStyle(toolbar.value.$el, null)
    backgroundColor = css['background-color']
  }

  return {
    ...overflowOffsetVariables.value,
    '--size': `${ARROW_SIZE}px`,
    backgroundColor,
    left: x != null ? `calc(${x}px - var(--left-offset))` : null,
    top: y != null ? `calc(${y}px - var(--top-offset))` : null,
    [staticSide]: 'calc(var(--size) / -2)',
  }
})

onBeforeUnmount(() => {
  bus.off('esc-pressed', closePopper)
  removeOnOutsidePress()
})

onMounted(() => {
  bus.on('esc-pressed', closePopper)
})
</script>

<style lang="scss" scoped>
.floating {
  width: 'max-content';
  top: 0;
  left: 0;
  padding: 0px;
  border-radius: 0px;
  box-sizing: border-box;
  z-index: 1007;
  border: 0px !important;
  background-color: transparent !important;
  -webkit-box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
}

.floatingArrow {
  position: absolute;
  width: var(--size);
  height: var(--size);
  z-index: -1;
  pointer-events: none;
  transform: rotate(45deg);
}

.hidden {
  display: none;
}

.inner-card {
  max-width: 1000px;
  overflow-y: auto;
}
</style>
