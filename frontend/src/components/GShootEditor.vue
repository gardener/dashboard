<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="d-flex flex-column fill-height position-relative">
    <div
      v-if="!clean"
      class="flex-shrink-1"
    >
      <g-alert-banner
        type="warning"
        :identifier="alertBannerIdentifier"
        color="primary"
        transition="slide-y-transition"
      >
        <template #message>
          <slot name="modificationWarning" />
        </template>
      </g-alert-banner>
    </div>
    <div
      ref="container"
      :style="containerStyles"
    />
    <div
      v-if="!!$slots.errorMessage"
      class="flex-shrink-1"
    >
      <slot name="errorMessage" />
    </div>
    <v-divider />
    <div
      v-if="showToolbar"
      :style="toolbarStyles"
      class="d-flex align-center justify-space-between"
    >
      <div class="d-flex align-center justify-start fill-height">
        <div class="px-2">
          <g-action-button
            v-tooltip:top="'Discard and Reload'"
            size="x-small"
            icon="mdi-reload"
            :disabled="!touched"
            @click="refreshEditor"
          />
        </div>
        <v-divider vertical />
        <div class="px-2">
          <g-action-button
            v-tooltip:top="'Undo'"
            size="x-small"
            icon="mdi-undo"
            :disabled="historySize.undo === 0"
            @click="execUndo"
          />
        </div>
        <div class="px-2">
          <g-action-button
            v-tooltip:top="'Redo'"
            size="x-small"
            icon="mdi-redo"
            :disabled="historySize.redo === 0"
            @click="execRedo"
          />
        </div>
        <v-divider vertical />
        <div class="px-2">
          <g-action-button
            v-tooltip:top="'Download'"
            size="x-small"
            icon="mdi-download"
            @click="downloadContent"
          />
        </div>
        <div class="px-2">
          <g-copy-btn
            :clipboard-text="getDocumentValue"
            tooltip-text="Copy"
            :user-feedback="false"
            @click.stop="focusEditor"
            @copy="onCopy"
            @copy-failed="onCopyFailed"
          />
        </div>
        <v-divider vertical />
        <div class="px-2">
          <g-action-button
            v-tooltip:top="showManagedFields ? 'Hide managed fields' : 'Show managed fields'"
            size="x-small"
            :icon="showManagedFields ? 'mdi-text-short' : 'mdi-text-long'"
            :disabled="touched"
            @click="showManagedFields = !showManagedFields"
          />
        </div>
        <div class="px-2">
          <v-btn
            v-tooltip:top="renderWhitespaces ? 'Hide whitespaces' : 'Render whitespaces'"
            variant="text"
            size="x-small"
            flat
            icon
            @click="renderWhitespaces = !renderWhitespaces"
          >
            <!-- eslint-disable vue/no-v-html -->
            <span
              style="width: 18px; height: 18px"
              v-html="renderWhitespaces ? whitespaceEyeOff : whitespaceEye"
            />
          <!-- eslint-enable vue/no-v-html -->
          </v-btn>
        </div>
        <v-divider vertical />
      </div>
      <div class="d-flex fill-height align-center justify-end">
        <v-divider vertical />
        <slot name="toolbarItemsRight" />
      </div>
    </div>
    <v-tooltip
      location="right"
      absolute
      :model-value="helpTooltip.visible"
      :style="`left: ${helpTooltip.posX}px; top: ${helpTooltip.posY}px`"
      max-width="800px"
    >
      <span class="font-weight-bold">{{ helpTooltip.property }}</span><span class="font-style-italic ml-2">{{ helpTooltip.type }}</span><br>
      <span class="font-wrap">{{ helpTooltip.description }}</span>
    </v-tooltip>
    <v-snackbar
      v-model="snackbar"
      top
      absolute
      :color="snackbarColor"
      :timeout="snackbarTimeout"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
} from 'vue'
import download from 'downloadjs'

import GCopyBtn from '@/components/GCopyBtn'
import GActionButton from '@/components/GActionButton'
import GAlertBanner from '@/components/GAlertBanner'

import whitespaceEye from '@/assets/whitespace-eye.svg?raw'
import whitespaceEyeOff from '@/assets/whitespace-eye-off.svg?raw'

import camelCase from 'lodash/camelCase'

const props = defineProps({
  identifier: {
    type: String,
    required: true,
  },
  hideToolbar: {
    type: Boolean,
    default: false,
  },
})

const container = ref(null)
const snackbar = ref(false)
const snackbarTimeout = ref(3000)
const snackbarColor = ref()
const snackbarText = ref('')
const lineHeight = ref(21)
const toolbarHeight = ref(48)

const {
  clean,
  touched,
  showManagedFields,
  renderWhitespaces,
  historySize,
  helpTooltip,
  loadEditor,
  focusEditor,
  refreshEditor,
  destroyEditor,
  execUndo,
  execRedo,
  getDocumentValue,
  isReadOnly,
  filename,
} = inject(props.identifier)

const alertBannerIdentifier = computed(() => {
  return props.identifier === 'shoot-worker-editor'
    ? 'workerEditorWarning'
    : `${camelCase(props.identifier)}Warning`
})

const containerStyles = computed(() => {
  return {
    flex: '1 1 auto',
    minHeight: `${lineHeight.value * 3}px`,
    overflow: 'scroll',
  }
})

const toolbarStyles = computed(() => {
  return {
    flex: '0 0 auto',
    height: `${toolbarHeight.value}px`,
    minHeight: `${toolbarHeight.value}px`,
  }
})

const showToolbar = computed(() => {
  return !isReadOnly.value && !props.hideToolbar
})

function downloadContent () {
  try {
    const value = getDocumentValue()
    download(value, filename.value, 'text/yaml')
    snackbarColor.value = undefined
    snackbarText.value = 'Content has been downloaded'
    snackbar.value = true
  } catch (err) {
    snackbarColor.value = 'error'
    snackbarText.value = 'Download content failed'
    snackbar.value = true
  }
  focusEditor()
}

function onCopy () {
  snackbarColor.value = undefined
  snackbarText.value = 'Copied content to clipboard'
  snackbar.value = true
}

function onCopyFailed () {
  snackbarColor.value = 'error'
  snackbarText.value = 'Copy to clipboard failed'
  snackbar.value = true
}

onMounted(() => {
  loadEditor(container.value)
})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<style lang="scss">
  /* Styling the dropdown background and border */
  .cm-tooltip-autocomplete {
    li[aria-selected] {
      background-color: rgb(var(--v-theme-toolbar-background)) !important;
      color: rgb(var(--v-theme-toolbar-title)) !important;
    }
  }

  .cm-editor {
    height: 100%;
  }

  .cm-scroller {
    outline: none;
  }

</style>
