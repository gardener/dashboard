<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-divider />
  <div class="v-data-table-footer">
    <template v-if="pageCount">
      <div class="v-data-table-footer__items-per-page">
        <span>Rows per page:</span>
        <v-select
          :items="itemsPerPageOptions"
          :model-value="itemsPerPage"
          density="compact"
          variant="solo"
          flat
          single-line
          hide-details
          width="105px"
          @update:model-value="value => setItemsPerPage(Number(value))"
        />
      </div>
      <div class="v-data-table-footer__info">
        {{ !itemsLength ? 0 : startIndex + 1 }}-{{ stopIndex }} of {{ itemsLength }}
      </div>
      <div class="v-data-table-footer__pagination">
        <v-btn
          icon="mdi-page-first"
          variant="plain"
          :disabled="page === 1"
          aria-label="First page"
          @click="setPage(1)"
        />
        <v-btn
          icon="mdi-chevron-left"
          variant="plain"
          :disabled="page === 1"
          aria-label="Previous page"
          @click="setPage(Math.max(1, page - 1))"
        />
        <v-btn
          icon="mdi-chevron-right"
          variant="plain"
          :disabled="page === pageCount"
          aria-label="Next page"
          @click="setPage(Math.min(pageCount, page + 1))"
        />
        <v-btn
          icon="mdi-page-last"
          variant="plain"
          :disabled="page === pageCount"
          aria-label="Last page"
          @click="setPage(pageCount)"
        />
      </div>
    </template>
    <div
      v-else
      class="v-data-table-footer__info"
    >
      {{ itemsLength }} Rows
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  toRefs,
} from 'vue'

const props = defineProps({
  itemsLength: {
    type: Number,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    required: false,
  },
  itemsPerPageOptions: {
    type: Array,
    default: () => ([
      { value: 10, title: '10' },
      { value: 25, title: '25' },
      { value: 50, title: '50' },
      { value: 100, title: '100' },
      { value: -1, title: 'Infinite' },
    ]),
  },
  page: {
    type: Number,
    required: false,
  },
  pageCount: {
    type: Number,
    required: false,
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
