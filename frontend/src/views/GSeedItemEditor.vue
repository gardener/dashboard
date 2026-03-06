<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-yaml-editor
    class="fill-height"
    :identifier="injectionKey"
    hide-managed-fields-toggle
  />
</template>

<script setup>
import { provide } from 'vue'

import GYamlEditor from '@/components/GYamlEditor.vue'

import { useSeedItem } from '@/composables/useSeedItem/index'
import { useSeedEditor } from '@/composables/useSeedEditor'

const injectionKey = 'seed-editor'

const {
  seedItem,
} = useSeedItem()

provide(injectionKey, useSeedEditor(seedItem))
</script>
