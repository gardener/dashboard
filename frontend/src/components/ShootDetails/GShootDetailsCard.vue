<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Details" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-information-outline
          </v-icon>
        </template>
        <g-list-item-content label="Name">
          {{ shootName }}
        </g-list-item-content>
        <template #append>
          <g-copy-btn :clipboard-text="shootName" />
        </template>
      </g-list-item>
      <template v-if="shootExpirationTimestamp && !isShootMarkedForDeletion">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-clock-outline
            </v-icon>
          </template>
          <g-list-item-content>
            <template #label>
              <div class="d-flex align-center">
                Cluster Termination
                <g-shoot-messages
                  filter="cluster-expiration"
                  small
                />
              </div>
            </template>
            {{ selfTerminationMessage }}
          </g-list-item-content>
        </g-list-item>
      </template>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-cube-outline
          </v-icon>
        </template>
        <g-list-item-content>
          <template #label>
            <div class="d-flex align-center">
              Kubernetes Version
              <g-shoot-messages
                v-if="!isShootMarkedForDeletion"
                filter="k8s"
                small
              />
            </div>
          </template>
          <g-shoot-version-chip />
        </g-list-item-content>
        <template #append>
          <g-shoot-version-configuration />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-server
          </v-icon>
        </template>
        <g-list-item-content>
          <template #label>
            <div class="d-flex align-center">
              Worker Groups
              <g-shoot-messages
                v-if="!isShootMarkedForDeletion"
                filter="machine-image"
                small
              />
            </div>
          </template>
          <g-worker-groups />
        </g-list-item-content>
        <template
          #append
        >
          <g-worker-configuration />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-account-outline
          </v-icon>
        </template>
        <g-list-item-content label="Created by">
          <g-account-avatar
            :account-name="shootCreatedBy"
            mail-to
          />
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Created at">
          <g-time-string
            :date-time="shootMetadata.creationTimestamp"
            mode="past"
          />
        </g-list-item-content>
      </g-list-item>
      <template v-if="!!shootPurpose">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-label-outline
            </v-icon>
          </template>
          <g-list-item-content label="Purpose">
            {{ shootPurpose }}
          </g-list-item-content>
          <template #append>
            <!-- the selectable purposes depend on the used secretbinding which the user needs to be able to read in order to properly show the purpose configuration dialog -->
            <g-purpose-configuration
              v-if="canGetSecrets"
            />
          </template>
        </g-list-item>
      </template>
      <template v-if="slaDescriptionHtml">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-file-document-outline
            </v-icon>
          </template>
          <g-list-item-content :label="slaTitle">
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="markdown"
              v-html="slaDescriptionHtml"
            />
            <!-- eslint-enable vue/no-v-html -->
          </g-list-item-content>
        </g-list-item>
      </template>
      <template v-if="accessRestriction">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-earth
            </v-icon>
          </template>
          <g-list-item-content label="Access Restrictions">
            <div
              v-if="shootSelectedAccessRestrictions.length"
              class="d-flex flex-wrap align-center"
            >
              <g-access-restriction-chips :selected-access-restrictions="shootSelectedAccessRestrictions" />
            </div>
            <span v-else>
              No access restrictions configured
            </span>
          </g-list-item-content>
          <template #append>
            <g-access-restrictions-configuration />
          </template>
        </g-list-item>
      </template>
      <template v-if="hasShootWorkerGroups">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-puzzle
            </v-icon>
          </template>
          <g-list-item-content>
            <template #label>
              Add-ons <span class="text-caption">(not actively monitored and provided on a best-effort basis only)</span>
            </template>
            <div
              v-if="shootAddonNames.length"
              class="d-flex flex-wrap align-center"
            >
              <v-chip
                v-for="(name, index) in shootAddonNames"
                :key="index"
                size="small"
                variant="tonal"
                color="primary"
                class="mr-2"
              >
                {{ name }}
              </v-chip>
            </div>
            <span v-else>No addons configured</span>
          </g-list-item-content>
          <template #append>
            <g-addon-configuration />
          </template>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useConfigStore } from '@/store/config'
import { useAuthzStore } from '@/store/authz'

import GAccessRestrictionChips from '@/components/ShootAccessRestrictions/GAccessRestrictionChips'
import GAccountAvatar from '@/components/GAccountAvatar'
import GTimeString from '@/components/GTimeString'
import GWorkerGroups from '@/components/ShootWorkers/GWorkerGroups'
import GWorkerConfiguration from '@/components/ShootWorkers/GWorkerConfiguration'
import GAccessRestrictionsConfiguration from '@/components/ShootAccessRestrictions/GAccessRestrictionsConfiguration'
import GPurposeConfiguration from '@/components/GPurposeConfiguration'
import GShootVersionConfiguration from '@/components/ShootVersion/GShootVersionConfiguration'
import GShootVersionChip from '@/components/ShootVersion/GShootVersionChip'
import GShootMessages from '@/components/ShootMessages/GShootMessages'
import GAddonConfiguration from '@/components/ShootAddons/GAddonConfiguration'
import GCopyBtn from '@/components/GCopyBtn'

import { useShootItem } from '@/composables/useShootItem'

import utils, {
  getTimeStringTo,
  shootAddonList,
  transformHtml,
} from '@/utils'

import {
  filter,
  map,
} from '@/lodash'

const {
  shootMetadata,
  shootName,
  shootCreatedBy,
  shootPurpose,
  shootExpirationTimestamp,
  isShootMarkedForDeletion,
  shootAddons,
  hasShootWorkerGroups,
  shootSelectedAccessRestrictions,
} = useShootItem()

const configStore = useConfigStore()
const {
  sla,
  accessRestriction,
} = storeToRefs(configStore)

const authzStore = useAuthzStore()
const {
  canGetSecrets,
} = storeToRefs(authzStore)

const selfTerminationMessage = computed(() => {
  if (isValidTerminationDate.value) {
    return `This cluster will self terminate ${getTimeStringTo(new Date(), new Date(shootExpirationTimestamp.value))}`
  } else {
    return 'This cluster is about to self terminate'
  }
})

const isValidTerminationDate = computed(() => {
  return utils.isValidTerminationDate(shootExpirationTimestamp.value)
})

const addon = computed(() => {
  return name => {
    return shootAddons.value[name] || {}
  }
})

const shootAddonNames = computed(() => {
  return map(filter(shootAddonList, item => addon.value(item.name).enabled), 'title')
})

const slaDescriptionHtml = computed(() => {
  return transformHtml(sla.value.description)
})

const slaTitle = computed(() => {
  return sla.value.title
})
</script>

<style lang="scss" scoped>
  .markdown {
    :deep(> p) {
      margin: 0px;
    }
  }
</style>
