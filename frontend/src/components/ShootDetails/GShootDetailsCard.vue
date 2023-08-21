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
          <g-list-item-content label="Cluster Termination">
            <div class="d-flex align-center">
              <g-shoot-messages
                :shoot-item="shootItem"
                filter="cluster-expiration"
                small
                class="mr-1"
              />
              <span>{{ selfTerminationMessage }}</span>
            </div>
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
        <g-list-item-content label="Kubernetes Version">
          {{ shootK8sVersion }}
        </g-list-item-content>
        <template #append>
          <g-shoot-messages
            v-if="!isShootMarkedForDeletion"
            :shoot-item="shootItem"
            filter="k8s"
          />
          <g-shoot-version :shoot-item="shootItem" />
        </template>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-server
          </v-icon>
        </template>
        <g-list-item-content label="Worker Groups">
          <div
            v-if="!isShootWorkerless"
            class="d-flex flex-wrap align-center"
          >
            <g-worker-group
              v-for="workerGroup in shootWorkerGroups"
              :key="workerGroup.name"
              v-model="workerGroupTab"
              :worker-group="workerGroup"
              :cloud-profile-name="shootCloudProfileName"
              :shoot-item="shootItem"
              class="mr-2"
            />
          </div>
          <span v-else>
            Workerless Cluster
          </span>
        </g-list-item-content>
        <template
          v-if="!isShootWorkerless"
          #append
        >
          <g-shoot-messages
            v-if="!isShootMarkedForDeletion"
            :shoot-item="shootItem"
            filter="machine-image"
          />
          <g-worker-configuration
            :shoot-item="shootItem"
          />
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
              :shoot-item="shootItem"
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
            <g-access-restrictions-configuration
              :shoot-item="shootItem"
            />
          </template>
        </g-list-item>
      </template>
      <template v-if="!isShootWorkerless">
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
                variant="outlined"
                color="primary"
                class="mr-2"
              >
                {{ name }}
              </v-chip>
            </div>
            <span v-else>No addons configured</span>
          </g-list-item-content>
          <template #append>
            <g-addon-configuration :shoot-item="shootItem" />
          </template>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script>
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'
import { useAuthzStore } from '@/store/authz'

import GAccessRestrictionChips from '@/components/ShootAccessRestrictions/GAccessRestrictionChips'
import GAccountAvatar from '@/components/GAccountAvatar'
import GTimeString from '@/components/GTimeString'
import GWorkerGroup from '@/components/ShootWorkers/GWorkerGroup'
import GWorkerConfiguration from '@/components/ShootWorkers/GWorkerConfiguration'
import GAccessRestrictionsConfiguration from '@/components/ShootAccessRestrictions/GAccessRestrictionsConfiguration'
import GPurposeConfiguration from '@/components/GPurposeConfiguration'
import GShootVersion from '@/components/ShootVersion/GShootVersion'
import GShootMessages from '@/components/ShootMessages/GShootMessages'
import GAddonConfiguration from '@/components/ShootAddons/GAddonConfiguration'
import GCopyBtn from '@/components/GCopyBtn'

import {
  isValidTerminationDate,
  getTimeStringTo,
  shootAddonList,
  transformHtml,
} from '@/utils'
import { shootItem } from '@/mixins/shootItem'

import {
  filter,
  map,
} from '@/lodash'

export default {
  components: {
    GAccessRestrictionChips,
    GAccountAvatar,
    GTimeString,
    GWorkerGroup,
    GWorkerConfiguration,
    GAccessRestrictionsConfiguration,
    GPurposeConfiguration,
    GAddonConfiguration,
    GShootVersion,
    GShootMessages,
    GCopyBtn,
  },
  mixins: [shootItem],
  data () {
    return {
      workerGroupTab: 'overview',
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'sla',
      'accessRestriction',
    ]),
    ...mapState(useAuthzStore, ['canGetSecrets']),
    selfTerminationMessage () {
      if (this.isValidTerminationDate) {
        return `This cluster will self terminate ${getTimeStringTo(new Date(), new Date(this.shootExpirationTimestamp))}`
      } else {
        return 'This cluster is about to self terminate'
      }
    },
    isValidTerminationDate () {
      return isValidTerminationDate(this.shootExpirationTimestamp)
    },
    addon () {
      return (name) => {
        return this.shootAddons[name] || {}
      }
    },
    shootAddonNames () {
      return map(filter(shootAddonList, item => this.addon(item.name).enabled), 'title')
    },
    slaDescriptionHtml () {
      return transformHtml(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    },
  },
}
</script>

<style lang="scss" scoped>
  .markdown {
    :deep(> p) {
      margin: 0px;
    }
  }
</style>
