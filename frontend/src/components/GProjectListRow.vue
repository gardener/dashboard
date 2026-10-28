<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <tr>
    <td
      v-for="header in headers"
      :key="header.key"
      :class="header.class"
      :align="header.align"
    >
      <template v-if="header.key === 'name'">
        <div
          v-tooltip:top="{
            text: 'This Project is still being created and will be available shortly',
            disabled: !projectPending,
          }"
        >
          <g-text-router-link
            v-if="!projectPending"
            :to="shootsRoute"
            :text="projectName"
          />
          <span
            v-else
            aria-disabled="true"
            class="text-medium-emphasis"
          >{{ projectName }}</span>
        </div>
      </template>
      <template v-else-if="header.key === 'title'">
        <span
          v-if="projectTitle"
          v-tooltip:top="projectTitle"
          class="project-text text-truncate"
        >{{ projectTitle }}</span>
      </template>
      <template v-else-if="header.key === 'description'">
        <span
          v-if="projectDescription"
          v-tooltip:top="projectDescription"
          class="project-text text-truncate"
        >{{ projectDescription }}</span>
      </template>
      <template v-else-if="header.key === 'purpose'">
        <span
          v-if="projectPurpose"
          v-tooltip:top="projectPurpose"
          class="project-text text-truncate"
        >{{ projectPurpose }}</span>
      </template>
      <template v-else-if="header.key === 'owner'">
        <g-account-avatar
          :account-name="projectOwner"
          mail-to
        />
      </template>
      <template v-else-if="header.key === 'status'">
        <div class="d-flex align-center justify-center">
          <g-project-status :project="project" />
        </div>
      </template>
      <template v-else-if="header.key === 'createdBy'">
        <g-account-avatar
          :account-name="projectCreatedBy"
          mail-to
        />
      </template>
      <template v-else-if="header.key === 'createdAt'">
        <g-time-string
          :date-time="projectCreationTimestamp"
          mode="past"
        />
      </template>
      <template v-else-if="header.key === 'staleness'">
        <div
          v-if="projectStaleSinceTimestamp || projectStaleAutoDeleteTimestamp"
          class="d-flex align-center"
        >
          <g-stale-project-warning
            :project="project"
            size="small"
          />
          <span
            v-if="projectStaleAutoDeleteTimestamp"
            class="ml-1"
          >
            Auto-delete
            <g-time-string
              :date-time="projectStaleAutoDeleteTimestamp"
              mode="future"
            />
          </span>
          <span
            v-else
            class="ml-1"
          >
            Stale
            <g-time-string
              :date-time="projectStaleSinceTimestamp"
              mode="past"
            />
          </span>
        </div>
      </template>
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GProjectStatus from '@/components/GProjectStatus.vue'
import GStaleProjectWarning from '@/components/GStaleProjectWarning.vue'
import GTextRouterLink from '@/components/GTextRouterLink.vue'
import GTimeString from '@/components/GTimeString.vue'

import { getProjectTitle } from '@/composables/useProjectMetadata/helper.js'
import { isProjectPending } from '@/composables/useProjectItem'

import get from 'lodash/get'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  headers: {
    type: Array,
    required: true,
  },
})

const projectName = computed(() => get(props.project, ['metadata', 'name'], ''))
const projectTitle = computed(() => getProjectTitle(props.project))
const projectDescription = computed(() => get(props.project, ['spec', 'description'], ''))
const projectPurpose = computed(() => get(props.project, ['spec', 'purpose'], ''))
const projectOwner = computed(() => get(props.project, ['spec', 'owner', 'name'], ''))
const projectCreatedBy = computed(() => get(props.project, ['spec', 'createdBy', 'name'], ''))
const projectCreationTimestamp = computed(() => get(props.project, ['metadata', 'creationTimestamp']))
const projectStaleSinceTimestamp = computed(() => get(props.project, ['status', 'staleSinceTimestamp']))
const projectStaleAutoDeleteTimestamp = computed(() => get(props.project, ['status', 'staleAutoDeleteTimestamp']))
const projectPending = computed(() => isProjectPending(props.project))

const shootsRoute = computed(() => ({
  name: 'ShootList',
  params: {
    projectName: projectName.value,
  },
}))
</script>

<style lang="scss" scoped>
.project-text {
  display: inline-block;
  max-width: 200px;
  vertical-align: middle;
}
</style>
