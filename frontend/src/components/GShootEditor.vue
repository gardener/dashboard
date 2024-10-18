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
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <g-action-button
                  size="x-small"
                  icon="mdi-reload"
                  :disabled="!touched"
                  @click="resetEditor"
                />
              </div>
            </template>
            <span>Discard and Reload</span>
          </v-tooltip>
        </div>
        <v-divider vertical />
        <div class="px-2">
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <g-action-button
                  size="x-small"
                  icon="mdi-undo"
                  :disabled="historySize.undo === 0"
                  @click="execUndo"
                />
              </div>
            </template>
            <span>Undo</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <g-action-button
                  size="x-small"
                  icon="mdi-redo"
                  :disabled="historySize.redo === 0"
                  @click="execRedo"
                />
              </div>
            </template>
            <span>Redo</span>
          </v-tooltip>
        </div>
        <v-divider vertical />
        <div class="px-2">
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <g-action-button
                  size="x-small"
                  icon="mdi-download"
                  @click="downloadContent"
                />
              </div>
            </template>
            <span>Download</span>
          </v-tooltip>
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
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <g-action-button
                  size="x-small"
                  :icon="showManagedFields ? 'mdi-text-short' : 'mdi-text-long'"
                  :disabled="touched"
                  @click="showManagedFields = !showManagedFields"
                />
              </div>
            </template>
            <span>{{ showManagedFields ? 'Hide' : 'Show' }} managed fields</span>
          </v-tooltip>
        </div>
        <div class="px-2">
          <v-tooltip location="top">
            <template #activator="slotProps">
              <div v-bind="slotProps.props">
                <v-btn
                  variant="text"
                  size="x-small"
                  flat
                  icon
                  @click="renderWhitespaces = !renderWhitespaces"
                >
                  <!-- eslint-disable vue/no-v-html -->
                  <span
                    style="width: 18px; height: 18px"
                    v-html="renderWhitespaces ? whitespaceEye : whitespaceEyeOff"
                  />
                  <!-- eslint-enable vue/no-v-html -->
                </v-btn>
              </div>
            </template>
            <span>{{ renderWhitespaces ? 'Hide' : 'Render' }} whitespaces</span>
          </v-tooltip>
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

import { camelCase } from '@/lodash'
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
  resetEditor,
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

const whitespaceEye = computed(() => {
  return `
    <svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="whitespace-eye" transform="translate(2, 10)" fill="rgb(var(--v-theme-action-button))" fill-rule="nonzero">
            <path d="M15,6.88 C15.56,6.88 16,7.32 16,7.88 C16,8.44 15.56,8.88 15,8.88 C14.44,8.88 14,8.43 14,7.88 C14,7.33 14.44,6.88 15,6.88 M15,3.88 C17.73,3.88 20.06,5.54 21,7.88 C20.06,10.22 17.73,11.88 15,11.88 C12.27,11.88 9.94,10.22 9,7.88 C9.94,5.54 12.27,3.88 15,3.88 M15,5.38 C13.62,5.38 12.5,6.5 12.5,7.88 C12.5,9.26 13.62,10.38 15,10.38 C16.38,10.38 17.5,9.26 17.5,7.88 C17.5,6.5 16.38,5.38 15,5.38 M0,1.77635684e-15 L0,7 C0,8.1 0.9,9 2,9 L7.42,9 C7.26,8.68 7.12,8.34 7,8 C7.12,7.66 7.26,7.32 7.42,7 L2,7 L2,1.77635684e-15 M16,0 C16,1.37582568 16,2.06373851 16,2.06373851 C16.6954344,2.15253355 17.3688755,2.33212115 18,2.59 L18,0 L16,0 Z" id="Shape"></path>
        </g>
    </svg>
      `
})

const whitespaceEyeOff = computed(() => {
  return `
    <svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="whitespace-eye-off" transform="translate(1.11, 1.73)" fill="rgb(var(--v-theme-action-button))" fill-rule="nonzero">
            <path d="M0.89,8.27 L0.89,15.27 C0.89,16.37 1.79,17.27 2.89,17.27 L8.31,17.27 C8.15,16.95 8.01,16.61 7.89,16.27 C8.01,15.93 8.15,15.59 8.31,15.27 L2.89,15.27 L2.89,8.27 L0.89,8.27 Z M16.89,8.27 C16.89,9.64582568 16.89,10.3337385 16.89,10.3337385 C17.5854344,10.4225335 18.2588755,10.6021212 18.89,10.86 L18.89,8.27 L16.89,8.27 Z" id="Shape"></path>
            <path d="M21.2,17.38 C21.47,17 21.71,16.59 21.89,16.15 C20.96,13.84 18.67,12.19 15.98,12.16 L21.2,17.38 Z M19.73,21 L18.39,19.64 C17.6,19.96 16.77,20.15 15.89,20.15 C13.16,20.15 10.83,18.49 9.89,16.15 C10.34,15.03 11.12,14.07 12.1,13.37 L0,1.27 L1.28,0 L21,19.73 L19.73,21 Z M17.07,18.34 L13.7,14.97 C13.5,15.32 13.39,15.72 13.39,16.15 C13.39,17.53 14.51,18.65 15.89,18.65 C16.32,18.65 16.72,18.54 17.07,18.34 Z" id="Shape"></path>
        </g>
    </svg>
      `
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
