<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
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
</template>

<script setup>
import { toRefs } from 'vue'

import GTimeString from '@/components/GTimeString.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'

import { useProjectMetadata } from '@/composables/useProjectMetadata'
import { useProvideProjectItem } from '@/composables/useProjectItem.js'

const props = defineProps({
  project: { type: Object },
})
const { project } = toRefs(props)
const {
  projectName,
  projectTitle,
} = useProjectMetadata(project)
const {
  projectDescription,
  projectOwner,
  projectCreatedBy,
  projectCreationTimestamp,
  projectPurpose,
} = useProvideProjectItem(project)

</script>
