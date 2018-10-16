<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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

        <v-card class="cyan darken-2">
          <v-card-title class="subheading white--text">
            Details
          </v-card-title>
          <v-list>

            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">info_outline</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>Name</v-list-tile-sub-title>
                <v-list-tile-title>
                  {{metadata.name}}
                  <self-termination-warning :expirationTimestamp="expirationTimestamp"></self-termination-warning>
                </v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>

            <v-list-tile>
              <v-list-tile-action>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>Kubernetes Version</v-list-tile-sub-title>
              </v-list-tile-content>
              <shoot-version class="pr-3" :k8sVersion="k8sVersion" :shootName="metadata.name" :shootNamespace="metadata.namespace" :availableK8sUpdates="availableK8sUpdates"></shoot-version>
            </v-list-tile>

            <v-divider class="my-2" inset></v-divider>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">perm_identity</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>Created by</v-list-tile-sub-title>
                <v-list-tile-title><a :href="`mailto:${createdBy}`" class="cyan--text text--darken-2">{{createdBy}}</a></v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>

            <v-list-tile>
              <v-list-tile-action>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-tooltip top>
                  <template slot="activator">
                    <v-list-tile-sub-title>Created at</v-list-tile-sub-title>
                    <v-list-tile-title>{{created}}</v-list-tile-title>
                  </template>
                  <time-string :dateTime="metadata.creationTimestamp" :pointInTime="-1"></time-string>
                </v-tooltip>
              </v-list-tile-content>
            </v-list-tile>

            <template v-if="!!purpose">
              <v-divider class="my-2" inset></v-divider>
              <v-list-tile>
                <v-list-tile-action>
                  <v-icon class="cyan--text text--darken-2">label_outline</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                  <v-list-tile-sub-title>Purpose</v-list-tile-sub-title>
                  <v-list-tile-title>{{purpose}}</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </template>

            <v-divider class="my-2" inset></v-divider>
            <v-list-tile>
              <v-list-tile-action>
                <v-icon class="cyan--text text--darken-2">mdi-sleep</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-sub-title>Hibernation</v-list-tile-sub-title>
              </v-list-tile-content>
              <shoot-hibernation :shootItem="item"></shoot-hibernation>
            </v-list-tile>

          </v-list>
        </v-card>

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
                        <span>{{secret}} </span>
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
            Addons
          </v-card-title>
          <v-list subheader>
            <v-subheader>Addons provided by Gardener</v-subheader>
            <v-list-tile avatar v-for="item in addonList" :key="item.name" v-if="addon(item.name).enabled">
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
            <v-subheader>Custom addons</v-subheader>
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

      <v-flex md6 v-show="isInfoAvailable">
        <status-card :shootItem="item"></status-card>

        <v-card>
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            Access
          </v-card-title>
          <cluster-access :item="item"></cluster-access>
          <template v-if="!!kubeconfig">
            <v-divider class="my-2" inset></v-divider>
            <v-expansion-panel>
              <v-expansion-panel-content>
                <div slot="header" class="kubeconfig-title">
                  <v-icon class="cyan--text text--darken-2">insert_drive_file</v-icon>
                  <span>KUBECONFIG</span>
                </div>
                <v-card>
                  <code-block lang="yaml" :content="info.kubeconfig"></code-block>
                </v-card>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </template>
        </v-card>

        <journals v-if="isAdmin" :journals="journals" :shoot="item"></journals>

      </v-flex>

    </v-layout>

  </v-container>

</template>

<script>
import { mapGetters } from 'vuex'
import CodeBlock from '@/components/CodeBlock'
import ClusterAccess from '@/components/ClusterAccess'
import Journals from '@/components/Journals'
import TimeString from '@/components/TimeString'
import ShootVersion from '@/components/ShootVersion'
import StatusCard from '@/components/StatusCard'
import SelfTerminationWarning from '@/components/SelfTerminationWarning'
import ShootHibernation from '@/components/ShootHibernation'
import get from 'lodash/get'
import includes from 'lodash/includes'
import find from 'lodash/find'
import forEach from 'lodash/forEach'
import { SnotifyPosition } from 'vue-snotify'
import {
  getDateFormatted,
  getCloudProviderKind,
  canLinkToSeed,
  availableK8sUpdatesForShoot,
  isSelfTerminationWarning,
  isValidTerminationDate,
  getTimeStringTo
} from '@/utils'

import 'codemirror/mode/yaml/yaml.js'

export default {
  name: 'shoot-item',
  components: {
    CodeBlock,
    ClusterAccess,
    Journals,
    TimeString,
    ShootVersion,
    StatusCard,
    SelfTerminationWarning,
    ShootHibernation
  },
  data () {
    return {
      addonList: [
        {
          name: 'cluster-autoscaler',
          title: 'Cluster Autoscaler',
          description: 'Cluster Autoscaler is a tool that automatically adjusts the size of the Kubernetes cluster.'
        },
        {
          name: 'kube-lego',
          title: 'Kube Lego',
          description: 'Kube-Lego automatically requests certificates for Kubernetes Ingress resources from Let\'s Encrypt.'
        },
        {
          name: 'kubernetes-dashboard',
          title: 'Dashboard',
          description: 'General-purpose web UI for Kubernetes clusters.'
        },
        {
          name: 'monocular',
          title: 'Monocular',
          description: 'Monocular is a web-based UI for managing Kubernetes applications and services packaged as Helm Charts. It allows you to search and discover available charts from multiple repositories, and install them in your cluster with one click.'
        },
        {
          name: 'nginx-ingress',
          title: 'Nginx Ingress',
          description: 'An Ingress is a Kubernetes resource that lets you configure an HTTP load balancer for your Kubernetes services. Such a load balancer usually exposes your services to clients outside of your Kubernetes cluster.'
        }
      ],
      mounted: false,
      selfTerminationNotification: undefined
    }
  },
  methods: {
    showSelfTerminationWarning () {
      if (!this.selfTerminationNotification) {
        const config = {
          timeout: 5000,
          closeOnClick: false,
          showProgressBar: false,
          position: SnotifyPosition.rightBottom,
          titleMaxLength: 20
        }
        if (this.isSelfTerminationWarning) {
          this.selfTerminationNotification = this.$snotify.warning(this.selfTerminationNotificationMessage, `Cluster Termination`, config)
        } else {
          this.selfTerminationNotification = this.$snotify.info(this.selfTerminationNotificationMessage, `Cluster Termination`, config)
        }
      }
    }
  },
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName',
      'journalsByNamespaceAndName',
      'isAdmin',
      'namespaces',
      'customAddonDefinitionList'
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
    kubeconfig () {
      return get(this, 'info.kubeconfig')
    },
    isInfoAvailable () {
      return !!this.info
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
    createdBy () {
      return this.annotations['garden.sapcloud.io/createdBy'] || '-unknown-'
    },
    created () {
      return getDateFormatted(this.metadata.creationTimestamp)
    },
    expirationTimestamp () {
      return this.annotations['shoot.garden.sapcloud.io/expirationTimestamp']
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
    availableK8sUpdates () {
      return availableK8sUpdatesForShoot(get(this.item, 'spec'))
    },
    k8sVersion () {
      return get(this.item, 'spec.kubernetes.version')
    },
    selfTerminationNotificationMessage () {
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
    }
  },
  watch: {
    expirationTimestamp (expirationTimestamp) {
      if (expirationTimestamp) {
        this.showSelfTerminationWarning()
      }
    }
  },
  mounted () {
    this.mounted = true
    if (this.expirationTimestamp) {
      this.showSelfTerminationWarning()
    }
  },
  destroyed () {
    if (this.selfTerminationNotification) {
      this.$snotify.remove(this.selfTerminationNotification.id)
    }
  }
}
</script>

<style lang="styl" scoped>
  .subheading.v-card__title {
    height: 42px;
  }

  .v-expansion-panel {
    box-shadow: none;
    display: initial;

    >>> li {
      border: none;

      .v-expansion-panel__header {
        padding: 16px 32px 16px 16px !important;

        .material-icons {
          justify-content: flex-start;
        }

        .kubeconfig-title {
          .material-icons {
            padding-right: 30px;
          }

          span {
            font-size: 13px;
          }
        }

      }
    }
  }
</style>
