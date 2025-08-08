<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <!-- we make the tooltip background transparent so that it does not conflict with the cards background -->
  <v-tooltip
    location="top"
    :open-delay="openDelay"
    :open-on-hover="openOnHover"
  >
    <template #activator="{ props: activatorProps }">
      <div v-bind="activatorProps">
        <slot />
      </div>
    </template>
    <v-card elevation="12">
      <v-list>
        <v-list-item>
          <v-list-item-subtitle>Project Name</v-list-item-subtitle>
          <v-list-item-title>{{ projectName }}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="projectTitle">
          <v-list-item-subtitle>Project Title</v-list-item-subtitle>
          <v-list-item-title>{{ projectTitle }}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="projectDescription">
          <v-list-item-subtitle>Description</v-list-item-subtitle>
          <v-list-item-title>{{ projectDescription }}</v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-list-item-subtitle>Owner</v-list-item-subtitle>
          <v-list-item-title>
            <g-account-avatar
              :account-name="projectOwner"
            />
          </v-list-item-title>
        </v-list-item>
      </v-list>
      <v-list-item>
        <v-list-item-subtitle>Created By</v-list-item-subtitle>
        <v-list-item-title>
          <g-account-avatar
            :account-name="projectCreatedBy"
          />
        </v-list-item-title>
      </v-list-item>
      <v-list-item>
        <v-list-item-subtitle>Created At</v-list-item-subtitle>
        <v-list-item-title>
          <g-time-string
            :date-time="projectCreationTimestamp"
            :point-in-time="-1"
          />
        </v-list-item-title>
      </v-list-item>
      <v-list-item v-if="projectPurpose">
        <v-list-item-subtitle>Purpose</v-list-item-subtitle>
        <v-list-item-title>{{ projectPurpose }}</v-list-item-title>
      </v-list-item>
    </v-card>
  </v-tooltip>
</template>

<script setup>
import { toRefs } from 'vue'

import GTimeString from '@/components/GTimeString.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'

import { useProjectMetadata } from '@/composables/useProjectMetadata/index.js'
import { useProvideProjectItem } from '@/composables/useProjectItem.js'

const props = defineProps({
  project: { type: Object, required: true },
  openDelay: { type: Number, default: 200 },
  openOnHover: { type: Boolean, default: true },
})
const { project, openDelay, openOnHover } = toRefs(props)
const { projectName, projectTitle } = useProjectMetadata(project)
const { projectDescription, projectOwner, projectCreatedBy, projectCreationTimestamp, projectPurpose } = useProvideProjectItem(project)
</script>

<style lang="scss" scoped>
:deep(.v-overlay__content) {
  opacity: 1 !important;
  padding: 0;
}
</style>
