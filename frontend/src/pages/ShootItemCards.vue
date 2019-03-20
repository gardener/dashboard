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

  <v-container fluid grid-list-lg>
    <v-layout d-flex wrap row>
      <v-flex md6>
        <shoot-details-card :shootItem="item"></shoot-details-card>

        <v-card class="cyan darken-2 mt-3">
          <v-card-title class="subheading white--text">
            Infrastructure
          </v-card-title>
          <v-list>

            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">cloud_queue</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>Provider</v-list-tile-sub-title>
                <v-list-tile-title>
                  <v-tooltip top open-delay="500">
                    <span slot="activator"> {{getCloudProviderKind}} </span>
                    <span>Provider</span>
                  </v-tooltip>
                  /
                  <v-tooltip top open-delay="500">
                    <span slot="activator"> {{region}} </span>
                    <span>Region</span>
                  </v-tooltip>
                  <template v-if="!!secret">
                    /
                    <v-tooltip top open-delay="500">
                      <router-link slot="activator" class="cyan--text text--darken-2" :to="{ name: 'Secret', params: { name: secret, namespace } }">
                        <span>{{secret}}</span>
                      </router-link>
                      <span>Used Credential</span>
                    </v-tooltip>
                  </template>
                </v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>

            <template v-if="showSeedInfo">
              <v-divider class="my-2" inset></v-divider>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon class="cyan--text text--darken-2">spa</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-sub-title>Seed</v-list-tile-sub-title>
                  <v-list-tile-title>
                    <router-link v-if="canLinkToSeed" class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: seed, namespace:'garden' } }">
                      {{seed}}
                    </router-link>
                    <template v-else>
                      {{seed}}
                    </template>
                  </v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </template>

            <v-divider class="my-2" inset></v-divider>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">settings_ethernet</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>CIDR</v-list-tile-sub-title>
                <v-list-tile-title>{{cidr}}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
            <template v-if="!!shootIngressDomainText">
              <v-divider class="my-2" inset></v-divider>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon class="cyan--text text--darken-2">mdi-earth</v-icon>
                </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-sub-title>Ingress Domain</v-list-tile-sub-title>
                    <v-list-tile-title>{{shootIngressDomainText}}</v-list-tile-title>
                  </v-list-tile-content>
              </v-list-tile>
            </template>
          </v-list>
        </v-card>

        <v-card class="cyan darken-2 mt-3">
          <v-card-title class="subheading white--text" >
            Add-ons
          </v-card-title>
          <v-list subheader>
            <v-subheader>Add-ons provided by Gardener</v-subheader>
            <v-list-tile avatar v-for="item in shootAddonList" :key="item.name">
              <v-list-tile-avatar>
                <v-icon class="cyan--text text--darken-2">mdi-puzzle</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{item.title}}</v-list-tile-title>
                <v-list-tile-sub-title>{{item.description}}</v-list-tile-sub-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <template v-if="componentUrl(item.name)">
                  <v-btn icon :href="componentUrl(item.name)" target="_blank">
                    <v-icon color="cyan darken-2">mdi-open-in-new</v-icon>
                  </v-btn>
                </template>
              </v-list-tile-action>
            </v-list-tile>
          </v-list>

          <template v-if="customAddonList.length">
            <v-divider></v-divider>
            <v-list subheader>
            <v-subheader>Custom add-ons</v-subheader>
            <v-list-tile avatar v-for="item in customAddonList" :key="item.name">
              <v-list-tile-avatar>
                <v-icon class="cyan--text text--darken-2">mdi-puzzle</v-icon>
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{item.title}}</v-list-tile-title>
                <v-list-tile-sub-title>{{item.description}}</v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
            </v-list>
          </template>

        </v-card>

      </v-flex>

      <v-flex md6>
        <v-card v-if="canRenderControlPlane" class="mb-3">
          <v-card-title class="subheading white--text cyan darken-2">
            Control Plane
          </v-card-title>
          <control-plane :item="item"></control-plane>
        </v-card>

        <v-card>
          <v-card-title class="subheading white--text cyan darken-2">
            Access
          </v-card-title>
          <cluster-access :item="item"></cluster-access>
        </v-card>

        <v-card>
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            Monitoring
          </v-card-title>
          <monitoring :shootItem="item"></monitoring>
        </v-card>

        <v-card v-show="isLoggingFeatureGateEnabled">
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            Logging
          </v-card-title>
          <logging :shootItem="item"></logging>
        </v-card>

        <v-card class="cyan darken-2 mt-3">
          <v-card-title class="subheading white--text">
            Lifecycle
          </v-card-title>
          <v-list>

            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">mdi-sleep</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Hibernation</v-list-tile-title>
                <v-list-tile-sub-title>
                  <v-layout v-if="isShootHasNoHibernationScheduleWarning" align-center row fill-height class="pa-0 ma-0">
                    <v-icon small color="cyan darken-2">mdi-calendar-alert</v-icon>
                    <span class="pl-2">{{hibernationDescription}}</span>
                  </v-layout>
                  <span v-else>{{hibernationDescription}}</span>
                </v-list-tile-sub-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <shoot-hibernation :shootItem="item"></shoot-hibernation>
              </v-list-tile-action>
              <v-list-tile-action>
                <hibernation-configuration ref="hibernationConfiguration" :shootItem="item"></hibernation-configuration>
              </v-list-tile-action>
            </v-list-tile>
            <v-divider class="my-2" inset></v-divider>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">mdi-wrench-outline</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Maintenance</v-list-tile-title>
                <v-list-tile-sub-title>{{maintenanceDescription}}</v-list-tile-sub-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <maintenance-start :shootItem="item"></maintenance-start>
              </v-list-tile-action>
              <v-list-tile-action>
                <maintenance-configuration :shootItem="item"></maintenance-configuration>
              </v-list-tile-action>
            </v-list-tile>

            <v-divider class="my-2" inset></v-divider>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">mdi-delete-circle-outline</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Delete Cluster</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <delete-cluster :shootItem="item"></delete-cluster>
              </v-list-tile-action>
            </v-list-tile>

          </v-list>
        </v-card>

        <journals v-if="isAdmin" :journals="journals" :shoot="item"></journals>

      </v-flex>

    </v-layout>

  </v-container>

</template>

<script>
import { mapGetters, mapState } from 'vuex'
import ControlPlane from '@/components/ControlPlane'
import Journals from '@/components/Journals'
import Monitoring from '@/components/Monitoring'
import ClusterAccess from '@/components/ClusterAccess'
import Logging from '@/components/Logging'
import ShootHibernation from '@/components/ShootHibernation'
import MaintenanceStart from '@/components/MaintenanceStart'
import MaintenanceConfiguration from '@/components/MaintenanceConfiguration'
import HibernationConfiguration from '@/components/HibernationConfiguration'
import DeleteCluster from '@/components/DeleteCluster'
import ShootDetailsCard from '@/components/ShootDetailsCard'
import get from 'lodash/get'
import includes from 'lodash/includes'
import find from 'lodash/find'
import forEach from 'lodash/forEach'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import {
  getCloudProviderKind,
  canLinkToSeed,
  isShootHasNoHibernationScheduleWarning
} from '@/utils'

import 'codemirror/mode/yaml/yaml.js'
import moment from 'moment-timezone'

export default {
  name: 'shoot-item',
  components: {
    ControlPlane,
    Journals,
    Monitoring,
    ShootDetailsCard,
    ClusterAccess,
    Logging,
    ShootHibernation,
    MaintenanceStart,
    MaintenanceConfiguration,
    HibernationConfiguration,
    DeleteCluster
  },
  data () {
    return {
      addonList: [
        {
          name: 'kubernetes-dashboard',
          title: 'Dashboard',
          description: 'General-purpose web UI for Kubernetes clusters'
        },
        {
          name: 'monocular',
          title: 'Monocular',
          description: 'Monocular is a web-based UI for managing Kubernetes applications and services packaged as Helm Charts. It allows you to search and discover available charts from multiple repositories, and install them in your cluster with one click.'
        },
        {
          name: 'nginx-ingress',
          title: 'Nginx Ingress (Deprecated)',
          description: 'This add-on is deprecated and will be removed in the future. You can install it or an alternative ingress controller always manually. If you choose to install it with the cluster, please note that Gardener will include it in its reconciliation and you can’t configure or override it’s configuration.'
        }
      ]
    }
  },
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName',
      'journalsByNamespaceAndName',
      'isAdmin',
      'namespaces',
      'hasTerminalAccess',
      'customAddonDefinitionList'
    ]),
    ...mapState([
      'localTimezone'
    ]),
    getCloudProviderKind () {
      return getCloudProviderKind(get(this.item, 'spec.cloud'))
    },
    componentUrl () {
      return (name) => {
        switch (name) {
          case 'monocular':
            return this.monocularUrl
          default:
            return undefined
        }
      }
    },
    monocularUrl () {
      return `https://monocular.ingress.${this.domain}`
    },
    showSeedInfo () {
      return !!this.seed && this.hasAccessToGardenNamespace
    },
    hasAccessToGardenNamespace () {
      return includes(this.namespaces, 'garden')
    },
    canLinkToSeed () {
      return canLinkToSeed({ shootNamespace: this.namespace })
    },
    namespace () {
      return get(this.$route.params, 'namespace')
    },
    value () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    info () {
      return get(this, 'value.info', {})
    },
    item () {
      return get(this, 'value', {})
    },
    isLoggingFeatureGateEnabled () {
      return !!this.info.logging_username && !!this.info.logging_password
    },
    journals () {
      const params = this.$route.params
      return this.journalsByNamespaceAndName(params)
    },
    metadata () {
      return this.item.metadata || {}
    },
    annotations () {
      return this.metadata.annotations || {}
    },
    domain () {
      return get(this.item, 'spec.dns.domain')
    },
    shootIngressDomainText () {
      const nginxIngressEnabled = get(this.item, 'spec.addons.nginx-ingress.enabled', false)
      if (!this.domain || !nginxIngressEnabled) {
        return undefined
      }
      return `*.ingress.${this.domain}`
    },
    region () {
      return get(this.item, 'spec.cloud.region')
    },
    secret () {
      return get(this.item, 'spec.cloud.secretBindingRef.name')
    },
    cidr () {
      return get(this.item, `spec.cloud.${this.getCloudProviderKind}.networks.nodes`)
    },
    seed () {
      return get(this.item, 'spec.cloud.seed')
    },
    purpose () {
      return this.annotations['garden.sapcloud.io/purpose']
    },
    addons () {
      return get(this.item, 'spec.addons', {})
    },
    addon () {
      return (name) => {
        return this.addons[name] || {}
      }
    },
    shootAddonList () {
      return filter(this.addonList, item => this.addon(item.name).enabled)
    },
    customAddonList () {
      try {
        const customAddonNames = JSON.parse(this.annotations['gardenextensions.sapcloud.io/addons'])
        const list = []
        forEach(customAddonNames, name => {
          const item = find(this.customAddonDefinitionList, ['name', name])
          if (item) {
            list.push(item)
          }
        })
        return list
      } catch (err) {
        return []
      }
    },
    hibernationDescription () {
      const purpose = this.purpose || ''
      if (get(this.item, 'spec.hibernation.schedules', []).length > 0) {
        return 'Hibernation schedule configured'
      } else if (this.isShootHasNoHibernationScheduleWarning) {
        return `Please configure a schedule for this ${purpose} cluster`
      } else {
        return 'No hibernation schedule configured'
      }
    },
    maintenanceDescription () {
      const timezone = this.localTimezone
      const maintenanceStart = get(this.item, 'spec.maintenance.timeWindow.begin')
      const momentObj = moment.tz(maintenanceStart, 'HHmmZ', timezone)
      if (momentObj.isValid()) {
        const maintenanceStr = momentObj.format('HH:mm')
        return `Start time: ${maintenanceStr} ${timezone}`
      }
      return ''
    },
    isShootHasNoHibernationScheduleWarning () {
      return isShootHasNoHibernationScheduleWarning(this.item)
    },
    canRenderControlPlane () {
      return !isEmpty(this.item) && this.hasTerminalAccess
    }
  },
  mounted () {
    if (get(this.$route, 'name') === 'ShootItemHibernationSettings') {
      this.$refs.hibernationConfiguration.showDialog()
    }
  }
}
</script>

<style lang="styl" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
