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
  <v-dialog v-model="visible" persistent max-width="1200" content-class="dialogContainer">
    <v-card flat>

      <v-toolbar dense class="draken-1 header">
        <v-toolbar-side-icon><v-icon x-large class="white--text">mdi-hexagon-multiple</v-icon></v-toolbar-side-icon>
        <v-toolbar-title>
          <span>Create Cluster</span>
        </v-toolbar-title>
        <v-tabs dark slot="extension" v-model="activeTab">
          <v-tabs-slider color="yellow"></v-tabs-slider>
          <v-tab key="infra"  href="#tab-infra"  ripple>Infrastructure</v-tab>
          <v-tab key="worker" href="#tab-worker" ripple>Worker</v-tab>
          <v-tab key="addons" href="#tab-addons" ripple>Addons</v-tab>
          <v-tab key="maintenance" href="#tab-maintenance" ripple>Maintenance</v-tab>
        </v-tabs>
      </v-toolbar>
      <v-tabs-items v-model="activeTab" class="items">
        <v-tab-item key="infra" value="tab-infra">
          <v-card flat>
            <v-container fluid>
              <v-card-text>

                <v-layout row>
                  <v-flex xs3>
                    <v-text-field
                      ref="name"
                      color="cyan darken-2"
                      label="Cluster Name"
                      counter="10"
                      v-model="clusterName"
                      :error-messages="getErrorMessages('shootDefinition.metadata.name')"
                      @input="$v.shootDefinition.metadata.name.$touch()"
                      @blur="$v.shootDefinition.metadata.name.$touch()"
                      ></v-text-field>
                  </v-flex>
                </v-layout>

                <v-layout row class="mt-2">
                  <v-flex xs3>
                    <v-select
                      color="cyan darken-2"
                      label="Infrastructure"
                      :items="sortedCloudProviderKindList"
                      v-model="infrastructureKind"
                      >
                      <template slot="item" slot-scope="data">
                        <v-list-tile-action>
                          <img v-if="data.item === 'alicloud'" src="@/assets/alicloud.svg" width="24">
                          <infra-icon v-else v-model="data.item"></infra-icon>
                        </v-list-tile-action>
                        <v-list-tile-content>
                          <v-list-tile-title>{{data.item}}</v-list-tile-title>
                        </v-list-tile-content>
                      </template>
                      <template slot="selection" slot-scope="data">
                        <img v-if="data.item === 'alicloud'" src="@/assets/alicloud.svg" width="24" class="mr-2">
                        <v-avatar v-else size="30px">
                          <infra-icon v-model="data.item"></infra-icon>
                        </v-avatar>
                        <span class="black--text">
                          {{data.item}}
                        </span>
                      </template>
                    </v-select>
                  </v-flex>

                  <v-flex xs1 v-show="cloudProfiles.length !== 1">
                  </v-flex>

                  <v-flex xs3 v-show="cloudProfiles.length !== 1">
                    <cloud-profile
                      ref="cloudProfile"
                      v-model="cloudProfileName"
                      :isCreateMode="true"
                      :cloudProfiles="cloudProfiles"
                      color="cyan darken-2">
                    </cloud-profile>
                  </v-flex>

                  <v-flex xs1>
                  </v-flex>

                  <v-flex xs3>
                    <v-select
                      color="cyan darken-2"
                      label="Secret"
                      :items="infrastructureSecretsByProfileName"
                      v-model="secret"
                      :error-messages="getErrorMessages('shootDefinition.spec.cloud.secretBindingRef.name')"
                      @input="$v.shootDefinition.spec.cloud.secretBindingRef.name.$touch()"
                      @blur="$v.shootDefinition.spec.cloud.secretBindingRef.name.$touch()"
                      persistent-hint
                      :hint="secretHint"
                      >
                      <template slot="item" slot-scope="data">
                        {{get(data.item, 'metadata.name')}}
                        <v-icon v-if="!isOwnSecretBinding(data.item)">mdi-share</v-icon>
                      </template>
                      <template slot="selection" slot-scope="data">
                        <span class="black--text">
                          {{get(data.item, 'metadata.name')}}
                        </span>
                        <v-icon v-if="!isOwnSecretBinding(data.item)">mdi-share</v-icon>
                      </template>
                    </v-select>
                  </v-flex>
                </v-layout>

                <v-layout row>
                  <v-flex xs3>
                    <v-select
                      color="cyan darken-2"
                      label="Region"
                      :items="regions"
                      v-model="region"
                      :error-messages="getErrorMessages('shootDefinition.spec.cloud.region')"
                      @input="$v.shootDefinition.spec.cloud.region.$touch()"
                      @blur="$v.shootDefinition.spec.cloud.region.$touch()"
                      ></v-select>
                  </v-flex>
                  <v-flex xs1>
                  </v-flex>
                  <v-flex xs3 v-if="infrastructureKind !== 'azure'">
                    <v-select
                      color="cyan darken-2"
                      label="Zone"
                      :items="zones"
                      :error-messages="getErrorMessages('infrastructureData.zones')"
                      v-model="zone"
                      @input="$v.infrastructureData.zones.$touch()"
                      @blur="$v.infrastructureData.zones.$touch()"
                      ></v-select>
                  </v-flex>
                </v-layout>

                <v-layout row>
                  <v-flex xs3>
                    <v-select
                      color="cyan darken-2"
                      label="Kubernetes"
                      :items="sortedKubernetesVersions"
                      v-model="shootDefinition.spec.kubernetes.version"
                      ></v-select>
                  </v-flex>
                  <v-flex xs1>
                  </v-flex>
                  <v-flex xs3>
                    <v-select
                      color="cyan darken-2"
                      label="Purpose"
                      :items="filteredPurposes"
                      v-model="shootDefinition.metadata.annotations['garden.sapcloud.io/purpose']"
                      hint="Indicate the importance of the cluster"
                      persistent-hint
                      @input="$v.shootDefinition.metadata.annotations['garden.sapcloud.io/purpose'].$touch()"
                      @blur="$v.shootDefinition.metadata.annotations['garden.sapcloud.io/purpose'].$touch()"
                      ></v-select>
                  </v-flex>
                </v-layout>

                <template v-if="infrastructureKind === 'openstack'">
                  <v-layout row>
                    <v-flex xs3>
                      <v-select
                      color="cyan darken-2"
                      label="Floating Pools"
                      :items="floatingPoolNames"
                      v-model="infrastructureData.floatingPoolName"
                      ></v-select>
                    </v-flex>
                    <v-flex xs1>
                    </v-flex>
                    <v-flex xs3>
                      <v-select
                      color="cyan darken-2"
                      label="Load Balancer Providers"
                      :items="loadBalancerProviderNames"
                      v-model="infrastructureData.loadBalancerProvider"
                      persistent-hint
                      ></v-select>
                    </v-flex>
                  </v-layout>
                </template>
              </v-card-text>
            </v-container>
          </v-card>
        </v-tab-item>

        <v-tab-item key="worker" value="tab-worker">

          <v-card flat>
            <v-container fluid >
              <transition-group name="list-complete">
                <v-layout row v-for="(worker, index) in workers" :key="worker.id"  class="list-complete-item pt-4 pl-3">
                  <v-flex pa-1 >

                    <worker-input-generic :worker.sync="worker" ref="workerInput"
                      :workers.sync="workers"
                      :cloudProfileName="cloudProfileName"
                      v-if="infrastructureKind === 'aws'">
                      <v-btn v-show="index>0 || workers.length>1"
                        small
                        slot="action"
                        outline
                        icon
                        class="grey--text lighten-2"
                        @click.native.stop="workers.splice(index, 1)">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </worker-input-generic>

                    <worker-input-generic :worker.sync="worker" ref="workerInput"
                      :workers.sync="workers"
                      :cloudProfileName="cloudProfileName"
                      v-if="infrastructureKind === 'azure'">
                      <v-btn v-show="index>0 || workers.length>1"
                        small
                        slot="action"
                        outline
                        icon
                        class="grey--text lighten-2"
                        @click.native.stop="workers.splice(index, 1)">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </worker-input-generic>

                    <worker-input-generic :worker.sync="worker" ref="workerInput"
                      :workers.sync="workers"
                      :cloudProfileName="cloudProfileName"
                      v-if="infrastructureKind === 'gcp'">
                      <v-btn v-show="index>0 || workers.length>1"
                        small
                        slot="action"
                        outline
                        icon
                        class="grey--text lighten-2"
                        @click.native.stop="workers.splice(index, 1)">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </worker-input-generic>

                    <worker-input-openstack :worker.sync="worker" ref="workerInput"
                      :workers.sync="workers"
                      :cloudProfileName="cloudProfileName"
                      v-if="infrastructureKind === 'openstack'">
                      <v-btn v-show="index>0 || workers.length>1"
                        small
                        slot="action"
                        outline
                        icon
                        class="grey--text lighten-2"
                        @click.native.stop="workers.splice(index, 1)">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </worker-input-openstack>

                    <worker-input-generic :worker.sync="worker" ref="workerInput"
                      :workers.sync="workers"
                      :cloudProfileName="cloudProfileName"
                      v-if="infrastructureKind === 'alicloud'">
                      <v-btn v-show="index>0 || workers.length>1"
                        small
                        slot="action"
                        outline
                        icon
                        class="grey--text lighten-2"
                        @click.native.stop="workers.splice(index, 1)">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </worker-input-generic>

                  </v-flex>
                </v-layout>
                <v-layout row key="1234" class="list-complete-item pt-4 pl-3 ">

                  <v-flex xs1>
                    <v-btn
                      small
                      @click="addWorker"
                      outline
                      fab
                      icon
                      class="cyan darken-2">
                      <v-icon class="cyan--text text--darken-2">add</v-icon>
                    </v-btn>
                  </v-flex>

                  <v-flex xs1 class="mt-2">
                    <v-btn
                      @click="addWorker"
                      flat
                      class="cyan--text text--darken-2">
                      Add Worker Group
                    </v-btn>
                  </v-flex>

                </v-layout>
              </transition-group>
            </v-container>
          </v-card>

        </v-tab-item>

        <v-tab-item key="addons" value="tab-addons">

          <v-card flat>
            <v-container>
              <v-list three-line class="mr-extra">
                <v-list-tile class="list-complete-item"
                  v-for="addonDefinition in addonDefinitionList"
                  :key="addonDefinition.name">
                  <v-list-tile-action>
                    <v-checkbox color="cyan darken-2" v-model="addons[addonDefinition.name].enabled"></v-checkbox>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <v-list-tile-title >{{addonDefinition.title}}</v-list-tile-title>
                    <v-list-tile-sub-title>{{addonDefinition.description}}</v-list-tile-sub-title>
                  </v-list-tile-content>
                </v-list-tile>
              </v-list>
            </v-container>
          </v-card>

        </v-tab-item>

        <v-tab-item key="maintenance" value="tab-maintenance">

          <v-card flat>
            <v-container fluid>
              <v-layout row wrap>
                <maintenance-time
                  ref="maintenanceTime"
                  :time-window-begin="shootDefinition.spec.maintenance.timeWindow.begin"
                  @updateMaintenanceWindow="onUpdateMaintenanceWindow"
                  @valid="onMaintenanceTimeValid"
                ></maintenance-time>
                <maintenance-components
                  :update-kubernetes-version="shootDefinition.spec.maintenance.autoUpdate.kubernetesVersion"
                  @updateKubernetesVersion="onUpdateKubernetesVersion"></maintenance-components>
              </v-layout>
            </v-container>
          </v-card>

        </v-tab-item>
      </v-tabs-items>
      <alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></alert>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
        <v-btn flat @click.native.stop="createClicked()" :disabled="!valid" class="cyan--text text--darken-2">Create</v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<script>
import { mapGetters, mapActions, mapState } from 'vuex'
import WorkerInputGeneric from '@/components/WorkerInputGeneric'
import WorkerInputOpenstack from '@/components/WorkerInputOpenstack'
import CloudProfile from '@/components/CloudProfile'
import MaintenanceComponents from '@/components/MaintenanceComponents'
import MaintenanceTime from '@/components/MaintenanceTime'
import Alert from '@/components/Alert'
import find from 'lodash/find'
import get from 'lodash/get'
import head from 'lodash/head'
import sortBy from 'lodash/sortBy'
import map from 'lodash/map'
import cloneDeep from 'lodash/cloneDeep'
import every from 'lodash/every'
import noop from 'lodash/noop'
import isEmpty from 'lodash/isEmpty'
import forEach from 'lodash/forEach'
import filter from 'lodash/filter'
import reduce from 'lodash/reduce'
import set from 'lodash/set'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import concat from 'lodash/concat'
import sample from 'lodash/sample'
import intersection from 'lodash/intersection'
import { required, maxLength } from 'vuelidate/lib/validators'
import { resourceName, noStartEndHyphen, noConsecutiveHyphen } from '@/utils/validators'
import InfraIcon from '@/components/InfrastructureIcon'
import { setDelayedInputFocus, isOwnSecretBinding, getValidationErrors } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import moment from 'moment-timezone'

const semSort = require('semver-sort')

function shortRandomString (length) {
  const start = 'abcdefghijklmnopqrstuvwxyz'
  const possible = start + '0123456789'
  var text = start.charAt(Math.floor(Math.random() * start.length))
  for (var i = 0; i < (length - 1); i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const validationErrors = {
  shootDefinition: {
    metadata: {
      name: {
        required: 'Name is required',
        maxLength: 'Name ist too long',
        resourceName: 'Name must only be lowercase letters, numbers and hyphens',
        unique: 'Cluster name must be unique',
        noConsecutiveHyphen: 'Cluster name must not contain consecutive hyphens',
        noStartEndHyphen: 'Cluster name must not start or end with a hyphen'
      },
      annotations: {
        'garden.sapcloud.io/purpose': {
          required: 'Purpose is required'
        }
      }
    },
    spec: {
      cloud: {
        secretBindingRef: {
          name: {
            required: 'Secret is required'
          }
        },
        region: {
          required: 'Region is required'
        }
      }
    }
  },
  infrastructureData: {
    zones: {
      zonesNotEmpty: 'Zone is required'
    }
  }
}

const standardAddonDefinitionList = [
  {
    name: 'kubernetes-dashboard',
    title: 'Dashboard',
    description: 'General-purpose web UI for Kubernetes clusters.',
    visible: true,
    enabled: true
  },
  {
    name: 'nginx-ingress',
    title: 'Nginx Ingress',
    description: 'An Ingress is a Kubernetes resource that lets you configure an HTTP load balancer for your Kubernetes services. Such a load balancer usually exposes your services to clients outside of your Kubernetes cluster.',
    visible: false,
    enabled: true
  }
]

const defaultShootDefinition = {
  apiVersion: 'garden.sapcloud.io/v1beta1',
  kind: 'Shoot',
  metadata: {
    name: null,
    namespace: null,
    annotations: {
      'garden.sapcloud.io/purpose': null
    }
  },
  spec: {
    cloud: {
      profile: null,
      region: null,
      secretBindingRef: {
        name: null
      }
    },
    kubernetes: {
      version: null
    },
    dns: {
      provider: null,
      domain: null
    },
    maintenance: {
      timeWindow: {
        begin: null,
        end: null
      },
      autoUpdate: {
        kubernetesVersion: true
      }
    },
    addons: reduce(standardAddonDefinitionList, (addons, { name, enabled }) => set(addons, name, { enabled }), {})
  }
}

export default {
  name: 'create-cluster-dialog',
  components: {
    WorkerInputGeneric,
    WorkerInputOpenstack,
    InfraIcon,
    Alert,
    CloudProfile,
    MaintenanceComponents,
    MaintenanceTime
  },
  props: {
    value: {
      type: Boolean,
      required: false
    }
  },
  data () {
    return {
      shootDefinition: undefined,
      infrastructureData: undefined,
      selectedSecret: undefined,
      selectedInfrastructureKind: undefined,
      activeTab: 'tab-infra',
      purposes: ['evaluation', 'development', 'production'],
      refs_: {},
      validationErrors,
      maintenanceTimeValid: false,
      errorMessage: undefined,
      detailedErrorMessage: undefined
    }
  },
  validations: {
    shootDefinition: {
      metadata: {
        name: {
          required,
          maxLength: maxLength(10),
          noConsecutiveHyphen,
          noStartEndHyphen, // Order is important for UI hints
          resourceName,
          unique (value) {
            return this.shootByNamespaceAndName({ namespace: this.namespace, name: value }) === undefined
          }
        },
        annotations: {
          'garden.sapcloud.io/purpose': {
            required
          }
        }
      },
      spec: {
        cloud: {
          secretBindingRef: {
            name: {
              required
            }
          },
          region: {
            required
          }
        }
      }
    },
    infrastructureData: {
      zones: {
        zonesNotEmpty () {
          if (this.infrastructureKind === 'azure') {
            return true
          }
          return !isEmpty(this.infrastructureData.zones)
        }
      }
    }
  },
  computed: {
    ...mapState([
      'user',
      'namespace'
    ]),
    ...mapGetters([
      'cloudProfileByName',
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName',
      'cloudProfilesByCloudProviderKind',
      'regionsByCloudProfileName',
      'loadBalancerProviderNamesByCloudProfileName',
      'floatingPoolNamesByCloudProfileName',
      'cloudProviderKindList',
      'kubernetesVersions',
      'infrastructureSecretsByInfrastructureKind',
      'infrastructureSecretsByCloudProfileName',
      'projectList',
      'domainList',
      'shootByNamespaceAndName',
      'customAddonDefinitionList'
    ]),
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    clusterName: {
      get () {
        return this.shootDefinition.metadata.name
      },
      set (name) {
        this.shootDefinition.metadata.name = name

        this.setDefaultDomain()
      }
    },
    infrastructureKind: {
      get () {
        return this.selectedInfrastructureKind
      },
      set (infrastructureKind) {
        this.selectedInfrastructureKind = infrastructureKind
        this.getInfraHandler().setDefaults()

        this.setDefaultCloudProfileName()
      }
    },
    cloudProfileName: {
      get () {
        return this.shootDefinition.spec.cloud.profile
      },
      set (cloudProfileName) {
        this.shootDefinition.spec.cloud.profile = cloudProfileName

        this.setDefaultSecret()
      }
    },
    secret: {
      get () {
        return this.selectedSecret
      },
      set (secret) {
        const secretBindingRef = {
          name: get(secret, 'metadata.bindingName')
        }
        this.shootDefinition.spec.cloud.secretBindingRef = secretBindingRef

        this.selectedSecret = secret

        this.setCloudProfileDefaults()

        this.setDefaultPurpose()
      }
    },
    region: {
      get () {
        return get(this.shootDefinition, 'spec.cloud.region')
      },
      set (region) {
        this.shootDefinition.spec.cloud.region = region

        this.getInfraHandler().setDefaultZone()
      }
    },
    zone: {
      get () {
        return head(this.infrastructureData.zones)
      },
      set (zone) {
        this.infrastructureData.zones = [zone]
      }
    },
    infrastructure () {
      return this.infrastructureData
    },
    cloudProfiles () {
      return sortBy(this.cloudProfilesByCloudProviderKind(this.infrastructureKind), [(item) => item.metadata.name])
    },
    cloudProfileNames () {
      return map(this.cloudProfiles, 'metadata.name')
    },
    workers () {
      return get(this.infrastructureData, 'workers', [])
    },
    addons () {
      return get(this.shootDefinition, 'spec.addons', {})
    },
    machineTypes () {
      return this.machineTypesByCloudProfileName(this.cloudProfileName)
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileName(this.cloudProfileName)
    },
    regions () {
      return this.regionsByCloudProfileName(this.cloudProfileName)
    },
    loadBalancerProviderNames () {
      return this.loadBalancerProviderNamesByCloudProfileName(this.cloudProfileName)
    },
    floatingPoolNames () {
      return this.floatingPoolNamesByCloudProfileName(this.cloudProfileName)
    },
    zones () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      const predicate = item => item.region === this.region
      return get(find(get(cloudProfile, 'data.zones'), predicate), 'names')
    },
    infrastructureSecretsByKind () {
      return this.infrastructureSecretsByInfrastructureKind(this.infrastructureKind)
    },
    infrastructureSecretsByProfileName () {
      return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
    },
    valid () {
      const workerInput = this.refs_.workerInput

      var workersValid = true
      if (workerInput) {
        const isValid = (element, index, array) => {
          return !element.$v.$invalid
        }
        workersValid = every([].concat(workerInput), isValid)
      }

      return workersValid && this.maintenanceTimeValid && !this.$v.$invalid
    },
    sortedKubernetesVersions () {
      return semSort.desc(cloneDeep(this.kubernetesVersions(this.cloudProfileName)))
    },
    sortedCloudProviderKindList () {
      return intersection(['openstack', 'aws', 'azure', 'gcp', 'alicloud'], this.cloudProviderKindList)
    },
    projectName () {
      const predicate = item => item.metadata.namespace === this.namespace
      const project = find(this.projectList, predicate)
      return get(project, 'metadata.name')
    },
    isOwnSecretBinding () {
      return (secret) => {
        return isOwnSecretBinding(secret)
      }
    },
    selfTerminationDays () {
      const clusterLifetimeDays = function (quotas, scope) {
        const predicate = item => get(item, 'spec.scope') === scope
        return get(find(quotas, predicate), 'spec.clusterLifetimeDays')
      }

      const quotas = get(this.selectedSecret, 'quotas')
      let terminationDays = clusterLifetimeDays(quotas, 'project')
      if (!terminationDays) {
        terminationDays = clusterLifetimeDays(quotas, 'secret')
      }

      return terminationDays
    },
    filteredPurposes () {
      return this.selfTerminationDays ? ['evaluation'] : this.purposes
    },
    addonDefinitionList () {
      const project = find(this.projectList, ['metadata.namespace', this.namespace])
      const customAddons = /#enableCustomAddons/i.test(project.data.purpose) ? this.customAddonDefinitionList : []
      return concat(filter(standardAddonDefinitionList, 'visible'), customAddons)
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      } else {
        return undefined
      }
    }
  },
  methods: {
    ...mapActions([
      'createShoot'
    ]),
    get (object, path, defaultValue) {
      return get(object, path, defaultValue)
    },
    getInfraHandler () {
      switch (this.infrastructureKind) {
        case 'aws':
          return {
            setDefaultZone: this.setDefaultZone,
            setDefaults: () => {
              this.infrastructureData = {
                networks: {
                  vpc: {
                    cidr: '10.250.0.0/16'
                  },
                  internal: [
                    '10.250.112.0/22'
                  ],
                  nodes: '10.250.0.0/16',
                  pods: '100.96.0.0/11',
                  public: [
                    '10.250.96.0/22'
                  ],
                  services: '100.64.0.0/13',
                  workers: [
                    '10.250.0.0/19'
                  ]
                },
                workers: null,
                zones: null
              }
            }
          }
        case 'azure':
          return {
            setDefaultZone: noop,
            setDefaults: () => {
              this.infrastructureData = {
                networks: {
                  vnet: {
                    cidr: '10.250.0.0/16'
                  },
                  nodes: '10.250.0.0/19',
                  pods: '100.96.0.0/11',
                  services: '100.64.0.0/13',
                  public: '10.250.96.0/22',
                  workers: '10.250.0.0/19'
                },
                workers: null
              }
            }
          }
        case 'gcp':
          return {
            setDefaultZone: this.setDefaultZone,
            setDefaults: () => {
              this.infrastructureData = {
                networks: {
                  nodes: '10.250.0.0/19',
                  pods: '100.96.0.0/11',
                  services: '100.64.0.0/13',
                  workers: [
                    '10.250.0.0/19'
                  ]
                },
                workers: null,
                zones: null
              }
            }
          }
        case 'openstack':
          return {
            setDefaultZone: this.setDefaultZone,
            setDefaults: () => {
              this.infrastructureData = {
                networks: {
                  nodes: '10.250.0.0/19',
                  pods: '100.96.0.0/11',
                  services: '100.64.0.0/13',
                  workers: [
                    '10.250.0.0/19'
                  ]
                },
                workers: null,
                zones: null
              }
            }
          }
        case 'alicloud':
            return {
              setDefaultZone: this.setDefaultZone,
              setDefaults: () => {
                this.infrastructureData = {
                  networks: {
                    vpc: {
                      cidr: '10.250.0.0/16'
                    },
                    nodes: '10.250.0.0/16',
                    pods: '100.96.0.0/11',
                    services: '100.64.0.0/13',
                    workers: [
                      '10.250.0.0/19'
                    ]
                  },
                  workers: null,
                  zones: null
                }
              }
            }
      }
    },
    createShootResource () {
      const data = cloneDeep(this.shootDefinition)
      const annotations = data.metadata.annotations
      const infrastructureData = cloneDeep(this.infrastructureData)
      forEach(infrastructureData.workers, worker => {
        delete worker.id
      })
      data.spec.cloud[this.infrastructureKind] = infrastructureData
      // transform addons specification
      const standardAddonNames = map(standardAddonDefinitionList, 'name')
      const standardAddons = pick(data.spec.addons, standardAddonNames)
      const customAddons = omit(data.spec.addons, standardAddonNames)
      data.spec.addons = standardAddons
      const enabledCustomAddonNames = reduce(customAddons, (accumulator, { enabled }, name) => !enabled ? accumulator : concat(accumulator, name), [])
      if (!isEmpty(enabledCustomAddonNames)) {
        annotations['gardenextensions.sapcloud.io/addons'] = JSON.stringify(enabledCustomAddonNames)
      }
      return this.createShoot(data)
    },
    addWorker () {
      const id = shortRandomString(5)
      this.infrastructureData.workers.push({
        id,
        name: `worker-${id}`,
        machineType: get(head(this.machineTypes), 'name'),
        volumeType: get(head(this.volumeTypes), 'name'),
        volumeSize: '50Gi',
        autoScalerMin: 1,
        autoScalerMax: 2
      })
    },
    createClicked () {
      Promise.resolve()
        .then(() => this.createShootResource())
        .then(() => {
          this.$emit('created')
          this.$emit('close', false)
        })
        .catch(err => {
          const errorDetails = errorDetailsFromError(err)
          this.errorMessage = `Failed to create cluster.`
          this.detailedErrorMessage = errorDetails.detailedMessage
          console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        })
    },
    cancelClicked () {
      this.$emit('close', true)
    },
    reset () {
      this.$v.$touch()

      this.activeTab = 'tab-infra'

      this.selectedSecret = undefined
      this.shootDefinition = cloneDeep(defaultShootDefinition)

      this.setDefaultInfrastructureKind()

      this.clusterName = shortRandomString(10)
      this.shootDefinition.metadata.namespace = this.namespace

      this.$nextTick(() => {
        this.$refs.maintenanceTime.reset()

        // randomize maintenance time window
        const hours = [22, 23, 0, 1, 2, 3, 4, 5]
        const randomHour = sample(hours)
        // use local timezone offset
        const randomMoment = moment.tz(randomHour, 'HH', moment.tz.guess()).utc()

        const utcBegin = randomMoment.format('HH0000+0000')
        randomMoment.add(1, 'h')
        const utcEnd = randomMoment.format('HH0000+0000')

        this.onUpdateMaintenanceWindow({ utcBegin, utcEnd })
      })

      this.errorMessage = undefined
      this.detailedMessage = undefined

      setDelayedInputFocus(this, 'name')
    },
    setDefaultDomain () {
      const domain = head(this.domainList)
      this.shootDefinition.spec.dns.domain = `${this.clusterName}.${this.projectName}.${domain.data.domain}`
      this.shootDefinition.spec.dns.provider = domain.data.provider
    },
    setDefaultInfrastructureKind () {
      this.infrastructureKind = head(this.sortedCloudProviderKindList)
    },
    setDefaultCloudProfileName () {
      let cloudProfileName = get(head(this.infrastructureSecretsByKind), 'metadata.cloudProfileName')
      if (!cloudProfileName) {
        cloudProfileName = head(this.cloudProfileNames)
      }
      this.cloudProfileName = cloudProfileName
    },
    setDefaultSecret () {
      this.secret = head(this.infrastructureSecretsByProfileName)
    },
    setDefaultPurpose () {
      this.shootDefinition.metadata.annotations['garden.sapcloud.io/purpose'] = head(this.filteredPurposes)
    },
    setCloudProfileDefaults () {
      this.setDefaultRegion()
      this.setDefaultKubernetesVersion()
      this.setDefaultWorker()

      if (this.infrastructureKind === 'openstack') {
        this.setDefaultFloatingPoolName()
        this.setDefaultLoadBalancerProvider()
      }
    },
    setDefaultFloatingPoolName () {
      this.infrastructureData.floatingPoolName = head(this.floatingPoolNames)
    },
    setDefaultLoadBalancerProvider () {
      this.infrastructureData.loadBalancerProvider = head(this.loadBalancerProviderNames)
    },
    setDefaultWorker () {
      this.infrastructureData.workers = []
      this.addWorker()
    },
    setDefaultRegion () {
      this.region = head(this.regions)
    },
    setDefaultKubernetesVersion () {
      this.shootDefinition.spec.kubernetes.version = head(this.sortedKubernetesVersions)
    },
    setDefaultZone () {
      const zoneName = sample(this.zones)
      if (zoneName) {
        this.infrastructureData.zones = [zoneName]
      } else {
        this.infrastructureData.zones = []
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onUpdateKubernetesVersion (value) {
      this.shootDefinition.spec.maintenance.autoUpdate.kubernetesVersion = value
    },
    onUpdateMaintenanceWindow ({ utcBegin, utcEnd }) {
      this.shootDefinition.spec.maintenance.timeWindow.begin = utcBegin
      this.shootDefinition.spec.maintenance.timeWindow.end = utcEnd
    },
    onMaintenanceTimeValid (value) {
      this.maintenanceTimeValid = value
    }
  },
  watch: {
    value (newValue) {
      if (newValue === true) {
        this.reset()
      }
    }
  },
  created () {
    // add custom addons to default shootDefinition
    forEach(this.customAddonDefinitionList, ({ name }) => {
      defaultShootDefinition.spec.addons[name] = {
        enabled: false
      }
    })
    this.reset()
  },
  mounted () {
    this.refs_ = this.$refs
  }
}
</script>

<style lang="styl" scoped>

  .dialogContainer{

    .header {
      background-image: url(../assets/cluster_background.svg);
      background-size: cover;
      color: white;
      padding-top: 30px;
      >>> .v-tabs__bar {
        background-color:rgba(255,255,255,0.1);
      }

      >>> .v-toolbar__title {
        margin-bottom: 25px;
        margin-left: 10px;
       }

      >>> .v-toolbar__side-icon {
        margin-bottom: 30px;
      }

      >>> .v-tabs__item {
        font-weight: 400;
      }
    }

    .items {
      margin: 10px;
      height: 410px !important;

      >>> .v-card__text{
        padding:0;
      }
    }

    .add_worker{
      margin-left: 30px;
      border: 0;
    }

  }

</style>
