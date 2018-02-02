<!--
Copyright 2018 by The Gardener Authors.

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
  <v-tabs :scrollable="false" v-model="tab">

    <v-tabs-bar class="white" fixed>
      <v-tabs-slider color="cyan darken-2"></v-tabs-slider>

      <v-tabs-item href="#formatted" ripple>
        Overview
      </v-tabs-item>

      <v-tabs-item href="#yaml" ripple>
        YAML
      </v-tabs-item>

    </v-tabs-bar>

    <v-tabs-content id="formatted" class="pt-2">
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
                    <v-list-tile-title>{{metadata.name}}</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>

                <v-divider class="my-2" inset></v-divider>
                <v-list-tile>
                  <v-list-tile-action>
                    <v-icon class="cyan--text text--darken-2">perm_identity</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-sub-title>Created by</v-list-tile-sub-title>
                    <v-list-tile-title>{{createdBy}}</v-list-tile-title>
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
                      {{timeAgo}}
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
                        <span slot="activator"> {{infrastructure.kind}} </span>
                        <span>Provider</span>
                      </v-tooltip>
                      /
                      <v-tooltip top open-delay="500">
                        <span slot="activator"> {{infrastructure.region}} </span>
                        <span>Region</span>
                      </v-tooltip>
                      /
                      <v-tooltip top open-delay="500">
                        <span slot="activator">{{infrastructure.secret}} </span>
                        <span>Used Credential</span>
                      </v-tooltip>
                    </v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>

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

              </v-list>
            </v-card>

            <v-card class="cyan darken-2 mt-3">
              <v-card-title class="subheading white--text" >
                Addons provided by Gardener
              </v-card-title>
              <v-list>

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
            </v-card>

          </v-flex>
          <v-flex md6 v-show="isInfoAvailable">

            <v-card>
              <v-card-title class="subheading white--text cyan darken-2">
                Kube-Cluster Access
              </v-card-title>
              <cluster-access :info="info"></cluster-access>
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
            </v-card>

          </v-flex>
        </v-layout>
      </v-container>
    </v-tabs-content>

    <v-tabs-content id="yaml">
      <v-card>
        <code-block height="100%" lang="yaml" :content="rawItem"></code-block>
      </v-card>
    </v-tabs-content>

  </v-tabs>
</template>


<script>
  import { mapGetters, mapActions } from 'vuex'
  import CodeBlock from '@/components/CodeBlock'
  import ClusterAccess from '@/components/ClusterAccess'
  import get from 'lodash/get'
  import { safeDump } from 'js-yaml'
  import { getDateFormatted, getTimeAgo } from '@/utils'

  export default {
    name: 'shoot-list',
    components: {
      CodeBlock,
      ClusterAccess
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
            name: 'heapster',
            title: 'Heapster',
            description: 'Heapster enables Container Cluster Monitoring and Performance Analysis.'
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
        ]
      }
    },
    methods: {
      componentUrl (name) {
        switch (name) {
          case 'monocular':
            return this.monocularUrl
        }
      },
      ...mapActions([
        'setSelectedShoot'
      ])
    },
    computed: {
      stateClass () {
        switch (this.lastOperation.state) {
          case 'Succeeded':
            return 'green--text text--darken-2'
          case 'Failed':
            return 'red--text text--darken-2'
          case 'Processing':
            return 'orange--text text--darken-2'
          default:
            return 'white--text'
        }
      },
      stateText () {
        if (!this.lastOperation.type) {
          return '...'
        }
        return `${this.lastOperation.type} ${this.lastOperation.state}`
      },
      ...mapGetters([
        'shootByNamespaceAndName'
      ]),
      userinfo () {
        if (this.info.username && this.info.password) {
          const username = encodeURIComponent(this.info.username)
          const password = encodeURIComponent(this.info.password)
          return `${username}:${password}`
        }
        return ''
      },
      monocularUrl () {
        let url = 'https://'
        const userinfo = this.userinfo
        if (userinfo) {
          url += `${userinfo}@`
        }
        url += `monocular.ingress.${this.dns.domain}`
        return url
      },
      rawItem () {
        const item = Object.assign({}, this.item)
        // delete in item copy
        delete item.info
        const metadata = item.metadata || {}
        if (metadata.annotations && metadata.annotations['seed.garden.sapcloud.io/kubeconfig']) {
          // delete in item orginal
          delete metadata.annotations['seed.garden.sapcloud.io/kubeconfig']
        }
        return safeDump(item, {
          skipInvalid: true
        })
      },
      item () {
        const params = this.$route.params
        const shoot = this.shootByNamespaceAndName(params)
        return shoot || {}
      },
      info () {
        return this.item.info || {}
      },
      isInfoAvailable () {
        return !!this.item.info
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
      timeAgo (time) {
        return getTimeAgo(this.metadata.creationTimestamp)
      },
      status () {
        return this.item.status || {}
      },
      spec () {
        return this.item.spec || {}
      },
      dns () {
        return this.spec.dns || {}
      },
      lastOperation () {
        return this.status.lastOperation || {}
      },
      domain () {
        return this.spec.domain || ''
      },
      infrastructure () {
        return this.spec.infrastructure || {}
      },
      vpc () {
        return this.infrastructure.vpc || {}
      },
      vnet () {
        return this.infrastructure.vnet || {}
      },
      cidr () {
        return get(this, 'spec.networks.nodes')
      },
      purpose () {
        return this.annotations['garden.sapcloud.io/purpose']
      },
      addons () {
        return this.spec.addons || {}
      },
      addon () {
        return (name) => {
          return this.addons[name] || {}
        }
      },
      tab: {
        get: function () {
          return this.$route.query.tab || 'formatted'
        },
        set: function (newTab) {
          newTab = newTab !== 'formatted' ? newTab : undefined
          if (newTab !== this.$route.query.tab) {
            this.$router.push({ query: { tab: newTab } })
          }
        }
      }
    }
  }
</script>


<style lang="styl" scoped>
  .subheading.card__title {
    height: 42px;
  }

  .expansion-panel {
    box-shadow: none;
    display: initial;

    >>> li {
      border: none;

      .expansion-panel__header {
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
