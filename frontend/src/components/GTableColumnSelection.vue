<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-menu
    v-model="columnSelectionMenu"
    location="left"
    offset="5"
    :close-on-content-click="false"
    absolute
    min-width="240"
    style="max-height: 80%"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-tooltip:top="'Column Selection'"
        v-bind="menuProps"
        icon="mdi-view-column"
        :color="activatorColor"
        :variant="activatorVariant"
      />
    </template>
    <v-card>
      <v-card-text class="pt-1">
        <div class="d-flex align-center justify-space-between">
          <span class="text-title-small text-medium-emphasis py-2">
            Column Selection
          </span>
          <v-btn
            v-tooltip:top="'Reset to Defaults'"
            icon="mdi-restore"
            size="small"
            variant="text"
            flat
            @click.stop="onReset"
          />
        </div>
        <v-checkbox-btn
          v-for="header in headers"
          :key="header.key"
          :model-value="header.selected"
          :color="checkboxColor(header.selected)"
          density="compact"
          class="text-body-medium"
          @update:model-value="onSetSelectedHeader(header)"
        >
          <template #label>
            <span
              v-if="header.customField"
              v-tooltip:top="'Custom Field'"
              class="text-body-small"
            >
              {{ header.title }}
              <v-icon
                color="primary"
                icon="mdi-playlist-star"
                end
              />
            </span>
            <span
              v-else
              class="text-body-small"
            >
              {{ header.title }}
            </span>
          </template>
        </v-checkbox-btn>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup>
import {
  ref,
  toRefs,
} from 'vue'

const columnSelectionMenu = ref(false)

// props
const props = defineProps({
  activatorColor: {
    type: String,
  },
  activatorVariant: {
    type: String,
  },
  headers: {
    type: Array,
  },
})

const { headers } = toRefs(props)

// emits
const emit = defineEmits([
  'reset',
  'setSelectedHeader',
])

function onSetSelectedHeader (header) {
  emit('setSelectedHeader', header)
}

function onReset () {
  emit('reset')
}

function checkboxColor (selected) {
  return selected ? 'primary' : ''
}
</script>
