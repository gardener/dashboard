<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-btn
    v-if="providerTypes.length === 1"
    v-tooltip:top="label"
    :data-test="buttonDataTest"
    icon="mdi-plus"
    @click="$emit('select', providerTypes[0])"
  />
  <v-menu
    v-else
    v-model="menu"
    :data-test="menuDataTest"
    location="left"
    absolute
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-tooltip:top="label"
        v-bind="menuProps"
        :data-test="buttonDataTest"
        icon="mdi-plus"
      />
    </template>
    <v-list density="compact">
      <v-list-subheader>
        {{ label }}
      </v-list-subheader>
      <v-list-item
        v-for="providerType in providerTypes"
        :key="providerType"
        @click="$emit('select', providerType)"
      >
        <template #prepend>
          <g-vendor-icon
            :name="providerType"
            :vendor-type="vendorType"
            :size="24"
          />
        </template>
        <v-list-item-title>
          {{ vendorDisplayName({ type: vendorType, name: providerType }) }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import {
  computed,
  ref,
} from 'vue'

import { useConfigStore } from '@/store/config'

import GVendorIcon from '@/components/GVendorIcon'

const props = defineProps({
  vendorType: {
    type: String,
    required: true,
    validator: value => ['infra', 'dns'].includes(value),
  },
  providerTypes: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select'])

const menu = ref(false)
const { vendorDisplayName } = useConfigStore()

const isInfra = computed(() => props.vendorType === 'infra')
const label = computed(() => isInfra.value ? 'Create Infrastructure Secret' : 'Create DNS Credential')
const buttonDataTest = computed(() => `create-${isInfra.value ? 'infra' : 'dns'}-credential-button`)
const menuDataTest = computed(() => `create-${isInfra.value ? 'infra' : 'dns'}-credential-menu`)
</script>
