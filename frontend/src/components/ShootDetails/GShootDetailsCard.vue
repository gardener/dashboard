<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Details</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-information-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Name</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{shootName}}
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <g-copy-btn :clipboard-text="shootName"></g-copy-btn>
        </v-list-item-action>
      </v-list-item>
      <template v-if="shootExpirationTimestamp && !isShootMarkedForDeletion">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-clock-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Cluster Termination</v-list-item-subtitle>
            <v-list-item-title class="d-flex align-center pt-1">
              <g-shoot-messages :shoot-item="shootItem" filter="cluster-expiration" small class="mr-1" />
              <span>{{selfTerminationMessage}}</span>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-cube-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Kubernetes Version</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{shootK8sVersion}}
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action class="mx-0" v-if="!isShootMarkedForDeletion">
          <g-shoot-messages :shoot-item="shootItem" filter="k8s" />
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <g-shoot-version :shoot-item="shootItem"></g-shoot-version>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-server</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Worker Groups</v-list-item-subtitle>
          <v-list-item-title class="d-flex flex-wrap align-center pt-1">
            <g-worker-group
            class="mr-2"
            v-for="workerGroup in shootWorkerGroups"
            :worker-group="workerGroup"
            :cloud-profile-name="shootCloudProfileName"
            :shoot-item="shootItem"
            :key="workerGroup.name"
            v-model="workerGroupTab"
            ></g-worker-group>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action class="mx-0" v-if="!isShootMarkedForDeletion">
          <g-shoot-messages :shoot-item="shootItem" filter="machine-image" />
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <g-worker-configuration :shoot-item="shootItem"></g-worker-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-account-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Created by</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <g-account-avatar :account-name="shootCreatedBy" mail-to></g-account-avatar>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Created at</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <g-time-string :date-time="shootMetadata.creationTimestamp" mode="past"></g-time-string>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <template v-if="!!shootPurpose">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-label-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Purpose</v-list-item-subtitle>
            <v-list-item-title class="pt-1">
              {{shootPurpose}}
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <!-- the selectable purposes depend on the used secretbinding which the user needs to be able to read in order to properly show the purpose configuration dialog -->
            <g-purpose-configuration v-if="canGetSecrets" :shoot-item="shootItem"></g-purpose-configuration>
          </v-list-item-action>
        </v-list-item>
      </template>
      <template v-if="slaDescriptionHtml">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-file-document-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>{{slaTitle}}</v-list-item-subtitle>
            <v-list-item-title class="pt-1 markdown" v-html="slaDescriptionHtml"/>
          </v-list-item-content>
        </v-list-item>
      </template>
      <template v-if="accessRestriction">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-earth</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Access Restrictions</v-list-item-subtitle>
            <v-list-item-title v-if="shootSelectedAccessRestrictions.length" class="d-flex flex-wrap align-center pt-1">
              <g-access-restriction-chips :selected-access-restrictions="shootSelectedAccessRestrictions"></g-access-restriction-chips>
            </v-list-item-title>
            <v-list-item-title v-else class="d-flex align-center pt-1">
              No access restrictions configured
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <g-access-restrictions-configuration
              :shoot-item="shootItem"></g-access-restrictions-configuration>
          </v-list-item-action>
        </v-list-item>
      </template>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-puzzle</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Add-ons <span class="text-caption">(not actively monitored and provided on a best-effort basis only)</span></v-list-item-subtitle>
          <v-list-item-title class="d-flex align-center pt-1">
            <template v-if="this.shootAddonNames.length">
              <v-chip v-for="(name, index) in this.shootAddonNames"
                :key="index"
                small
                outlined
                color="primary"
                class="mr-2"
              >
              {{name}}
              </v-chip>
            </template>
            <span v-else>No addons configured</span>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <g-addon-configuration :shoot-item="shootItem"></g-addon-configuration>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { mapState } from 'pinia'
import filter from 'lodash/filter'
import map from 'lodash/map'

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

import { useConfigStore, useAuthzStore } from '@/store'

import { shootItem } from '@/mixins/shootItem'

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
  data () {
    return {
      workerGroupTab: 'overview',
    }
  },
  mixins: [shootItem],
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
    ::v-deep > p {
      margin: 0px;
    }
  }

</style>
