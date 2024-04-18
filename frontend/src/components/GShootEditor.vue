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
      :class="containerClass"
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
            :clipboard-text="() => getContent()"
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
  nextTick,
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
  animateOnAppear: {
    type: Boolean,
  },
})

const container = ref(null)
const containerClass = ref('')
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
  historySize,
  helpTooltip,
  createEditor,
  focusEditor,
  resetEditor,
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

function animateExpansion () {
  containerClass.value = 'collapsed'
  nextTick(() => {
    // wait for ui to render collapsed class before setting animation class
    containerClass.value = 'animate'
    setTimeout(() => {
      containerClass.value = ''
    }, 1500) // remove after animation ends (1.5 sec)
  })
}

onMounted(() => {
  if (props.animateOnAppear) {
    animateExpansion()
  }
  createEditor(container.value)
  resetEditor()
  refreshEditor()
})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<style lang="scss" scoped>
  .no-margin {
    margin: 0 !important;
  }
  .position-relative {
    position: relative !important;
  }
  :deep(.cm-tab) {
     background: url('../assets/tab.png');
     background-position: right;
     background-repeat: no-repeat;
  }
  .font-style-italic {
    font-style: italic;
  }
  .font-wrap {
    white-space: pre-wrap;
  }
</style>
<style lang="scss">
  @import 'vuetify/settings';

  .CodeMirror-hint {

    .ghint-type  {
      color: #000;

      .property {
        font-weight: bold;
        font-size: 14px;
      }
      .type {
        font-style: italic;
        padding-left: 10px;
        font-size: 13px;
      }
    }
  }

  .CodeMirror-hint .ghint-desc  {
    white-space: pre-wrap;
    max-width: 800px;
    padding: 10px;

    .description {
      font-family: Roboto, sans-serif;
      font-size: 13px;
      color: map-get($grey, 'darken-3');
    }
  }

  .CodeMirror-hint-active {
    background-color: map-get($grey, 'lighten-4') !important;
  }

  .CodeMirror-hints.seti {
    background-color: #000;
  }

  .seti {
    .CodeMirror-hint {
      .ghint-type  {
        color: #fff;
      }
    }

    .CodeMirror-hint .ghint-desc  {
      .description {
        color: map-get($grey, 'lighten-3');
      }
    }

    .CodeMirror-hint-active {
      background-color: map-get($grey, 'darken-4') !important;
    }
  }

  .collapsed .CodeMirror-lines {
    max-height: 0px;
  }

  .animate .CodeMirror-lines {
    transition: max-height 1.5s;
    max-height: 100vh;
  }
</style>
