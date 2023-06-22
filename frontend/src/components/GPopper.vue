<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <span>
    <slot
      name="popperRef"
    ></slot>
  </span>
</template>

<!--//
<template>
  <span v-if="!disabled" :key="popperKey">
    <slot
      name="popperRef"
      :props="{
        id: 'my-slot-id',
        ref: 'anchorRef',
        onClick: togglePopper,
      }"
    />
    <div v-if="visible"
      ref="floatingRef"
      class="floating"
      :style="floatingStyle"
    >
      <div v-if="visible"
        ref="floatingArrowRef"
        class="floatingArrow"
        :style="floatingArrowStyle"
      />
      <v-card class="inner-card">
        <v-toolbar
          ref="toolbarRef"
          :height="32"
          :color="toolbarColor"
          flat
        >
          <v-toolbar-title class="text-toolbar-title text-subtitle-1">
            {{ title }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            density="comfortable"
            variant="text"
            size="small"
            icon="mdi-close"
            icon-color="toolbar-title"
            @click.stop="closePopper"
          />
        </v-toolbar>
        <slot name="card" />
        <v-card-text v-if="slots.default">
          <slot />
        </v-card-text>
      </v-card>
    </div>
  </span>
</template>

<script setup>
import { ref, computed, toRefs, onBeforeUnmount, onMounted, useSlots } from 'vue'
import { useFloating, autoUpdate, arrow, shift, autoPlacement, size, offset } from '@floating-ui/vue'
import { useEventBus, onClickOutside } from '@vueuse/core'

const ARROW_SIZE = 10 // px
const bus = useEventBus('esc-pressed')

const slots = useSlots()

const props = defineProps({
  popperKey: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
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

const {
  popperKey,
  disabled,
  toolbarColor,
  title,
  placement,
  boundariesSelector,
} = toRefs(props)

const emit = defineEmits([
  'update:visible',
])

const anchorRef = ref(null)
const floatingRef = ref(null)
const floatingArrowRef = ref(null)
const toolbarRef = ref(null)
const visible = ref(false)
const maxWidth = ref(null)
const maxHeight = ref(null)

const closePopper = () => {
  visible.value = false
  emit('update:visible', false)
}
console.log('slots', Object.keys(slots.popperRef._c))

const togglePopper = () => {
  visible.value = !visible.value
  emit('update:visible', visible.value)
}

const clippingBoundaryEl = computed(() => {
  if (typeof boundariesSelector.value === 'string') {
    return document.querySelector(boundariesSelector.value)
  }
  return boundariesSelector.value
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
} = useFloating(anchorRef, floatingRef, {
  placement,
  strategy: 'fixed',
  open: visible,
  whileElementsMounted (...args) {
    return autoUpdate(...args, { animationFrame: true })
  },
  middleware: [
    offset(ARROW_SIZE + 5),
    shift(),
    autoPlacement(autoPlacementOptions),
    size(sizeOptions),
    arrow({
      element: floatingArrowRef,
    }),
  ],
})

const removeOnOutsidePress = onClickOutside(floatingRef, () => {
  if (visible.value) {
    closePopper()
  }
}, { ignore: [anchorRef] })

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
  if (finalPlacement.value === 'bottom' && toolbarRef.value?.$el) {
    const css = getComputedStyle(toolbarRef.value.$el, null)
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
  bus.off(closePopper)
  removeOnOutsidePress()
})

onMounted(() => {
  bus.on(closePopper)
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
//-->
