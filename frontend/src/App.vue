<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <router-view />
  <g-notify />
</template>

<script setup>
  import { onKeyStroke, useEventBus } from '@vueuse/core'
  import GNotify from '@/components/GNotify.vue';

  const bus = useEventBus('esc-pressed')

  onKeyStroke('Escape', e => {
    bus.emit()
    e.preventDefault()
  })
</script>
