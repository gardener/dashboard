<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="!foolNoMore"
    class="d-flex justify-center align-top pt-6"
  >
    <v-card>
      <v-img
        :src="currentImage"
        class="ad-image cursor-pointer"
        height="150"
        width="1000"
      >
        <v-btn
          icon="mdi-close"
          size="x-small"
          class="close-btn"
          @click="closeAd"
        />
      </v-img>
    </v-card>
  </div>
  <g-dialog
    ref="adDialog"
    confirm-button-text="Ok"
    cancel-button-text=""
    width="700"
  >
    <template #caption>
      Ad-Free Option Selected
    </template>
    <template #content>
      <v-card-text>
        Thank you for choosing the Ad-Free option!
        <div class="pt-6">
          <strong style="font-size: 20px;">Additional Fee:</strong> <code><strong style="font-size: 20px;">$4.99</strong></code>
        </div>
        <div class="pt-2 text-medium-emphasis">
          Starting 1st of April, this Ad-Free fee will be automatically charged to your cost center. Enjoy an uninterrupted, ad-free experience!
        </div>
      </v-card-text>
    </template>
  </g-dialog>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  toRef,
} from 'vue'

import { useLocalStorageStore } from '@/store/localStorage'

import GDialog from '@/components/dialogs/GDialog.vue'

const images = [
  new URL('/src/assets/af/enlarge.png', import.meta.url).href,
  new URL('/src/assets/af/mars.png', import.meta.url).href,
  new URL('/src/assets/af/qubits.png', import.meta.url).href,
]
const initialIndex = Math.floor(Math.random() * images.length)

let intervalId

const adDialog = ref(null)

const currentImageIndex = ref(initialIndex)

const localStorageStore = useLocalStorageStore()
const foolNoMore = toRef(localStorageStore, 'foolNoMore')

const currentImage = computed(() => {
  return images[currentImageIndex.value]
})

function closeAd () {
  adDialog.value.showDialog()
  foolNoMore.value = true
  clearInterval(intervalId)
}

onMounted(() => {
  intervalId = setInterval(() => {
    currentImageIndex.value = (currentImageIndex.value + 1) % images.length
  }, 5_000)
})

</script>

<style lang="scss">
.close-btn {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
