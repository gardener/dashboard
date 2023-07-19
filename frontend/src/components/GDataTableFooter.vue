<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="v-data-table-footer">
    <div class="v-data-table-footer__items-per-page">
      <span>Rows per page:</span>
      <v-select
        :items="itemsPerPageOptions"
        :modelValue="itemsPerPage"
        @update:model-value="value => setItemsPerPage(Number(value))"
        density="compact"
        variant="solo"
        flat
        single-line
        hide-details
      />
    </div>
    <div class="v-data-table-footer__info">
      {{ !itemsLength ? 0 : startIndex + 1 }}-{{ stopIndex }} of {{ itemsLength }}
    </div>
    <div class="v-data-table-footer__pagination">
      <v-btn
        icon="mdi-page-first"
        variant="plain"
        @click="setPage(1)"
        :disabled="page === 1"
        aria-label="First page"
      />
      <v-btn
        icon="mdi-chevron-left"
        variant="plain"
        @click="setPage(Math.max(1, page - 1))"
        :disabled="page === 1"
        aria-label="Previous page"
      />
      <v-btn
        icon="mdi-chevron-right"
        variant="plain"
        @click="setPage(Math.min(pageCount, page + 1))"
        :disabled="page === pageCount"
        aria-label="Next page"
      />
      <v-btn
        icon="mdi-page-last"
        variant="plain"
        @click="setPage(pageCount)"
        :disabled="page === pageCount"
        aria-label="Last page"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, toRefs } from 'vue'

const props = defineProps({
  itemsLength: {
    type: Number,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    required: true,
  },
  itemsPerPageOptions: {
    type: Array,
    default: () => ([
      { value: 10, title: '10' },
      { value: 25, title: '25' },
      { value: 50, title: '50' },
      { value: 100, title: '100' },
      { value: -1, title: 'All' },
    ]),
  },
  page: {
    type: Number,
    required: true,
  },
  pageCount: {
    type: Number,
    required: true,
  },
})

const { page, pageCount, itemsLength, itemsPerPage, itemsPerPageOptions } = toRefs(props)

const startIndex = computed(() => {
  if (itemsPerPage.value === -1) return 0

  return itemsPerPage.value * (page.value - 1)
})
const stopIndex = computed(() => {
  if (itemsPerPage.value === -1) return itemsLength.value

  return Math.min(itemsLength.value, startIndex.value + itemsPerPage.value)
})

const emit = defineEmits([
  'update:page',
  'update:itemsPerPage',
])

function setItemsPerPage (value) {
  emit('update:itemsPerPage', value)
}

function setPage (value) {
  emit('update:page', value)
}

</script>
