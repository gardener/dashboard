<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-card>
    <v-card-title class="subheading white--text cyan darken-2 cardTitle">
      Details
    </v-card-title>
    <div class="list">
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">info_outline</v-icon>
        <v-flex class="pa-0">
          <span class="grey--text">Name</span><br>
          <span class="subheading">{{shootName}}</span>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <copy-btn :clipboard-text="shootName"></copy-btn>
          </v-layout>
        </v-flex>
      </v-card-title>

      <template v-if="expirationTimestamp">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem">
          <v-icon class="cyan--text text--darken-2 avatar">mdi-clock-outline</v-icon>
          <v-flex class="pa-0">
            <span class="grey--text">Cluster Termination</span><br>
            <v-layout align-center row fill-height class="pa-0 ma-0">
              <v-icon v-if="!isSelfTerminationWarning" color="cyan darken-2" small>mdi-information</v-icon>
              <v-icon v-else color="warning" small>mdi-alert-circle</v-icon>
              <span class="pl-2 subheading">{{selfTerminationMessage}}</span>
            </v-layout>
          </v-flex>
        </v-card-title>
      </template>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-cube-outline</v-icon>
        <v-flex class="pa-0">
          <span class="grey--text">Kubernetes Version</span><br>
          <span class="subheading">{{shootK8sVersion}}</span>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <shoot-version :shoot-item="shootItem" :chip-style="false"></shoot-version>
          </v-layout>
        </v-flex>
      </v-card-title>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-server</v-icon>
        <v-flex grow class="pa-0">
          <span class="grey--text">Worker Groups</span><br>
          <worker-group
          v-for="workerGroup in shootWorkerGroups"
          :workerGroup="workerGroup"
          :cloudProfileName="shootCloudProfileName"
          :key="workerGroup.name"
          ></worker-group>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <worker-configuration :shootItem="shootItem"></worker-configuration>
          </v-layout>
        </v-flex>
      </v-card-title>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem">
        <v-layout class="py-2">
          <v-flex shrink justify-center class="pr-0 pt-3">
            <v-icon class="cyan--text text--darken-2 avatar">perm_identity</v-icon>
          </v-flex>
          <v-flex class="pa-0">
            <span class="grey--text">Created by</span><br>
            <account-avatar :account-name="shootCreatedBy" :mail-to="true" class="pb-3"></account-avatar>
            <v-tooltip top>
              <template slot="activator">
                <span class="grey--text">Created at</span><br>
                <span class="subheading">{{shootCreatedAt}}</span>
              </template>
              <time-string :dateTime="shootMetadata.creationTimestamp" :pointInTime="-1"></time-string>
            </v-tooltip>
          </v-flex>
        </v-layout>
      </v-card-title>

      <template v-if="!!shootPurpose">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem pr-1">
          <v-icon class="cyan--text text--darken-2 avatar">label_outline</v-icon>
          <v-flex class="pa-0">
            <span class="grey--text">Purpose</span><br>
            <span class="subheading">{{shootPurpose}}</span>
          </v-flex>
          <v-flex shrink class="pa-0">
            <v-layout row>
              <!-- the selectable purposes depend on the used secretbinding which the user needs to be able to read in order to properly show the purpose configuration dialog -->
              <purpose-configuration v-if="canGetSecrets" :shootItem="shootItem"></purpose-configuration>
            </v-layout>
          </v-flex>
        </v-card-title>
      </template>

      <template v-if="slaDescriptionCompiledMarkdown">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem pr-1">
          <v-icon class="cyan--text text--darken-2 avatar">mdi-file-document-outline</v-icon>
          <v-flex class="pa-0">
            <span class="grey--text">{{slaTitle}}</span><br>
            <span class="slaDescription" v-html="slaDescriptionCompiledMarkdown" />
          </v-flex>
        </v-card-title>
      </template>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem pr-1">
        <v-icon class="cyan--text text--darken-2 avatar">mdi-puzzle</v-icon>
        <v-flex class="pa-0">
          <span class="grey--text">Add-ons (not actively monitored and provided on a best-effort basis only)</span><br>
          <span class="subheading" v-if="!this.shootAddonNames.length">No addons configured</span>
          <v-chip v-for="(name, index) in this.shootAddonNames" :key="index" small class="my-0 ml-0" outline color="cyan darken-2">{{name}}</v-chip>
        </v-flex>
        <v-flex shrink class="pa-0">
          <v-layout row>
            <addon-configuration :shootItem="shootItem"></addon-configuration>
          </v-layout>
        </v-flex>
      </v-card-title>
    </div>
  </v-card>
</template>

<script>

import AccountAvatar from '@/components/AccountAvatar'
import TimeString from '@/components/TimeString'
import WorkerGroup from '@/components/ShootWorkers/WorkerGroup'
import WorkerConfiguration from '@/components/ShootWorkers/WorkerConfiguration'
import PurposeConfiguration from '@/components/PurposeConfiguration'
import ShootVersion from '@/components/ShootVersion/ShootVersion'
import AddonConfiguration from '@/components/ShootAddons/AddonConfiguration'
import CopyBtn from '@/components/CopyBtn'
import filter from 'lodash/filter'
import map from 'lodash/map'
import {
  isSelfTerminationWarning,
  isValidTerminationDate,
  getTimeStringTo,
  shootAddonList,
  compileMarkdown
} from '@/utils'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'

export default {
  components: {
    AccountAvatar,
    TimeString,
    WorkerGroup,
    WorkerConfiguration,
    PurposeConfiguration,
    AddonConfiguration,
    ShootVersion,
    CopyBtn
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'canGetSecrets'
    ]),
    expirationTimestamp () {
      return this.shootAnnotations['shoot.gardener.cloud/expiration-timestamp'] || this.shootAnnotations['shoot.garden.sapcloud.io/expirationTimestamp']
    },
    selfTerminationMessage () {
      if (this.isValidTerminationDate) {
        return `This cluster will self terminate ${getTimeStringTo(new Date(), new Date(this.expirationTimestamp))}`
      } else {
        return 'This cluster is about to self terminate'
      }
    },
    isSelfTerminationWarning () {
      return isSelfTerminationWarning(this.expirationTimestamp)
    },
    isValidTerminationDate () {
      return isValidTerminationDate(this.expirationTimestamp)
    },
    addon () {
      return (name) => {
        return this.shootAddons[name] || {}
      }
    },
    shootAddonNames () {
      return map(filter(shootAddonList, item => this.addon(item.name).enabled), 'title')
    },
    sla () {
      return this.cfg.sla || {}
    },
    slaDescriptionCompiledMarkdown () {
      return compileMarkdown(this.sla.description)
    },
    slaTitle () {
      return this.sla.title
    }
  }
}
</script>

<style lang="styl" scoped>

  .cardTitle {
    line-height: 10px;
  }

  .listItem {
    padding-top: 0px;
    padding-bottom: 0px;
  }

  .list {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .avatar {
    padding-right: 33px;
  }

  .slaDescription >>> p {
    margin: 0px;
  }

</style>
