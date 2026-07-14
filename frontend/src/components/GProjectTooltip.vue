<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-detail-tooltip
    :activator="$slots.activator ? undefined : activator"
    location="right"
    :open-delay="openDelay"
    :open-on-hover="openOnHover"
    title="Project details"
    :width="360"
  >
    <template
      v-if="$slots.activator || !activator"
      #activator="{ props: activatorProps }"
    >
      <slot
        v-if="$slots.activator"
        name="activator"
        :props="activatorProps"
      />
      <div
        v-else
        class="project-tooltip-activator"
        tabindex="0"
        v-bind="activatorProps"
      >
        <slot />
      </div>
    </template>
    <dl class="project-details">
      <div class="project-detail-row">
        <dt>Name</dt>
        <dd>{{ projectName }}</dd>
      </div>
      <div
        v-if="projectTitle"
        class="project-detail-row"
      >
        <dt>Title</dt>
        <dd>{{ projectTitle }}</dd>
      </div>
      <div
        v-if="projectDescription"
        class="project-detail-row"
      >
        <dt>Description</dt>
        <dd>{{ projectDescription }}</dd>
      </div>
      <div class="project-detail-row">
        <dt>Owner</dt>
        <dd>
          <g-account-avatar
            :account-name="projectOwner"
          />
        </dd>
      </div>
      <div
        v-if="projectPurpose"
        class="project-detail-row"
      >
        <dt>Purpose</dt>
        <dd>{{ projectPurpose }}</dd>
      </div>
    </dl>
    <template #footer>
      <dl class="project-metadata">
        <div class="project-metadata-row">
          <dt>Created by</dt>
          <dd>
            <g-account-avatar
              :account-name="projectCreatedBy"
              :size="20"
            />
          </dd>
        </div>
        <div class="project-metadata-row">
          <dt>Created</dt>
          <dd>
            <g-time-string
              :date-time="projectCreationTimestamp"
              :point-in-time="-1"
            />
          </dd>
        </div>
      </dl>
    </template>
  </g-detail-tooltip>
</template>

<script setup>
import { toRefs } from 'vue'

import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GDetailTooltip from '@/components/GDetailTooltip.vue'
import GTimeString from '@/components/GTimeString.vue'

import { useProjectMetadata } from '@/composables/useProjectMetadata'
import { useProvideProjectItem } from '@/composables/useProjectItem.js'

const props = defineProps({
  project: { type: Object, required: true },
  activator: { type: [String, Object] },
  openDelay: { type: Number, default: 200 },
  openOnHover: { type: Boolean, default: true },
})
const {
  project,
  activator,
  openDelay,
  openOnHover,
} = toRefs(props)
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

<style lang="scss" scoped>
  .project-details,
  .project-metadata {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  .project-detail-row,
  .project-metadata-row {
    display: grid;
    gap: 16px;
    grid-template-columns: 88px minmax(0, 1fr);

    dt {
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    }

    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }

  .project-metadata-row {
    align-items: center;
  }
</style>
