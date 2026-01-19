<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-avatar
    :size="size"
    rounded="lg"
    tile
    :class="{ 'icon-background': !noBackground }"
  >
    <img
      v-if="iconSrc"
      :src="iconSrc"
      :style="iconStyle"
      :alt="`${icon} logo`"
      class="rounded-0"
    >
    <v-icon
      v-else
      :icon="mdiIcon"
      class="text-primary"
      style="font-size:1.5em"
    />
  </v-avatar>
</template>

<script setup>
import {
  computed,
  toRef,
} from 'vue'

import { useConfigStore } from '@/store/config'

import startsWith from 'lodash/startsWith'

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 24,
  },
  noBackground: {
    type: Boolean,
    default: false,
  },
})

const noBackground = toRef(props, 'noBackground')

const configStore = useConfigStore()

const iconName = computed(() => {
  if (props.icon) {
    return props.icon
  }
  const vendor = configStore.vendorDetails(props.name)
  return vendor?.icon
})

const iconSrc = computed(() => {
  if (!iconName.value) {
    return undefined
  }

  const safeIconNameRegex = /^[a-z0-9._-]+$/i
  if (!safeIconNameRegex.test(iconName.value)) {
    return undefined
  }

  return `/static/assets/${iconName.value}`
})

const mdiIcon = computed(() => {
  return startsWith(props.icon, 'mdi-')
    ? props.icon
    : 'mdi-blur-radial'
})

const iconStyle = computed(() => {
  const maxIconSize = props.size - 4
  return {
    maxHeight: `${maxIconSize}px`,
    maxWidth: `${maxIconSize}px`,
    height: `${maxIconSize}px`,
    width: `${maxIconSize}px`,
  }
})

</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

  .v-theme--dark .icon-background {
    background-color: map.get(vuetify.$grey, 'darken-2');
  }
</style>
