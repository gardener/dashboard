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
  <v-dialog v-model="visible" persistent max-width="1200" content-class="dialogContainer">
    <v-card flat>

      <v-card-text>
        <v-tabs v-model="activeTab">

          <v-toolbar class="draken-1 header">
            <v-icon x-large class="white--text">mdi-hexagon-multiple</v-icon>
            <span>Create Cluster</span>
            <v-tabs-bar dark slot="extension">
              <v-tabs-slider class="yellow"></v-tabs-slider>
              <v-tabs-item key="infra"  href="#tab-infra"  ripple>Infrastructure</v-tabs-item>
              <v-tabs-item key="worker" href="#tab-worker" ripple>Worker</v-tabs-item>
              <v-tabs-item key="addons" href="#tab-addons" ripple>Addons</v-tabs-item>
            </v-tabs-bar>
          </v-toolbar>

          <v-tabs-items>

            <v-tabs-content key="infra" id="tab-infra">
              <v-card flat>
                <v-container fluid>
                  <v-card-text>

                    <v-layout row>
                      <v-flex xs5>
                        <v-text-field
                          ref="name"
                          color="cyan"
                          label="Cluster Name"
                          counter="10"
                          :error-messages="nameErrors()"
                          v-model="shootDefinition.metadata.name"
                          ></v-text-field>
                      </v-flex>
                    </v-layout>

                    <v-layout row class="mt-2">
                      <v-flex xs2>
                        <v-select
                          color="cyan"
                          label="Infrastructure"
                          :items="infrastructureKinds"
                          v-model="infrastructureKind"
                          >
                          <template slot="item" slot-scope="data">
                            <v-list-tile-avatar>
                              <infra-icon v-model="data.item"></infra-icon>
                            </v-list-tile-avatar>
                            <v-list-tile-content>
                              <v-list-tile-title>{{data.item}}</v-list-tile-title>
                            </v-list-tile-content>
                          </template>
                          <template slot="selection" slot-scope="data">
                            <v-avatar size="30px">
                              <infra-icon v-model="data.item"></infra-icon>
                            </v-avatar>
                            <span class="black--text">
                              {{data.item}}
                            </span>
                          </template>
                        </v-select>
                      </v-flex>
                      <v-flex xs1>
                      </v-flex>
                      <v-flex xs2>
                        <v-select
                          color="cyan"
                          label="Secrets"
                          :items="infrastructureSecretNames"
                          :error-messages="secretErrors()"
                          v-model="shootDefinition.spec.infrastructure.secret"
                          ></v-select>
                      </v-flex>
                    </v-layout>

                    <v-layout row>
                      <v-flex xs2>
                        <v-select
                          color="cyan"
                          label="Region"
                          :items="infrastructureRegions"
                          :error-messages="regionErrors()"
                          v-model="region"
                          ></v-select>
                      </v-flex>
                    </v-layout>

                    <v-layout row>
                      <v-flex xs1>
                        <v-select
                          color="cyan"
                          label="Kubernetes"
                          :items="sortedKubernetesVersions"
                          v-model="shootDefinition.spec.kubernetesVersion"
                          ></v-select>
                      </v-flex>
                      <v-flex xs2>
                      </v-flex>
                      <v-flex xs2>
                        <v-select
                          color="cyan"
                          label="Purpose"
                          :items="purpose"
                          v-model="shootDefinition.metadata.annotations['garden.sapcloud.io/purpose']"
                          hint="Indicate the importance of the cluster"
                          persistent-hint
                          ></v-select>
                      </v-flex>
                    </v-layout>

                  </v-card-text>
                </v-container>
              </v-card>
            </v-tabs-content>

            <v-tabs-content key="worker" id="tab-worker">

              <v-card flat>
                <v-container fluid >
                  <transition-group name="list-complete">
                    <v-layout row v-for="(worker, index) in shootDefinition.spec.workers" :key="worker.id"  class="list-complete-item pt-4 pl-3">
                      <v-flex pa-1 >

                        <worker-input-aws :worker.sync="worker" ref="workerInput"
                          :workers.sync="shootDefinition.spec.workers"
                          v-if="infrastructureKind === 'aws'">
                          <v-btn v-show="index>0 || shootDefinition.spec.workers.length>1"
                            small
                            slot="action"
                            outline
                            icon
                            class="grey--text lighten-2"
                            @click.native.stop="shootDefinition.spec.workers.splice(index, 1)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </worker-input-aws>

                        <worker-input-azure :worker.sync="worker" ref="workerInput"
                          :workers.sync="shootDefinition.spec.workers"
                          v-if="infrastructureKind === 'azure'">
                          <v-btn v-show="index>0 || shootDefinition.spec.workers.length>1"
                            small
                            slot="action"
                            outline
                            icon
                            class="grey--text lighten-2"
                            @click.native.stop="shootDefinition.spec.workers.splice(index, 1)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </worker-input-azure>

                        <worker-input-gce :worker.sync="worker" ref="workerInput"
                          :workers.sync="shootDefinition.spec.workers"
                          v-if="infrastructureKind === 'gce'">
                          <v-btn v-show="index>0 || shootDefinition.spec.workers.length>1"
                            small
                            slot="action"
                            outline
                            icon
                            class="grey--text lighten-2"
                            @click.native.stop="shootDefinition.spec.workers.splice(index, 1)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </worker-input-gce>

                        <worker-input-openstack :worker.sync="worker" ref="workerInput"
                          :workers.sync="shootDefinition.spec.workers"
                          v-if="infrastructureKind === 'openstack'">
                          <v-btn v-show="index>0 || shootDefinition.spec.workers.length>1"
                            small
                            slot="action"
                            outline
                            icon
                            class="grey--text lighten-2"
                            @click.native.stop="shootDefinition.spec.workers.splice(index, 1)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </worker-input-openstack>

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
                          class="cyan">
                          <v-icon class="cyan--text">add</v-icon>
                        </v-btn>
                      </v-flex>

                      <v-flex xs1 class="mt-2">
                        <v-btn
                          @click="addWorker"
                          flat
                          class="cyan--text">
                          Add Worker Group
                        </v-btn>
                      </v-flex>

                    </v-layout>
                  </transition-group>
                </v-container>
              </v-card>

            </v-tabs-content>

            <v-tabs-content key="addons" id="tab-addons">

              <v-card flat>
                <v-container>
                  <v-list three-line class="mr-extra">

                    <v-list-tile avatar class="list-complete-item">
                      <v-list-tile-action>
                        <v-checkbox color="cyan" v-model="addons['kubernetes-dashboard'].enabled"></v-checkbox>
                      </v-list-tile-action>
                      <v-list-tile-content>
                        <v-list-tile-title >Dashboard</v-list-tile-title>
                        <v-list-tile-sub-title>
                          General-purpose web UI for Kubernetes clusters.
                        </v-list-tile-sub-title>
                      </v-list-tile-content>
                    </v-list-tile>

                    <v-list-tile  class="list-complete-item">
                      <v-list-tile-action>
                        <v-checkbox v-model="addons.monocular.enabled" class="cyan--text"></v-checkbox>
                      </v-list-tile-action>
                      <v-list-tile-content>
                        <v-list-tile-title >Monocular</v-list-tile-title>
                        <v-list-tile-sub-title>
                          Monocular is a web-based UI for managing Kubernetes applications and services
                          packaged as Helm Charts. It allows you to search and discover available charts from
                          multiple repositories, and install them in your cluster with one click.
                        </v-list-tile-sub-title>
                      </v-list-tile-content>
                    </v-list-tile>

                  </v-list>
                </v-container>
              </v-card>

            </v-tabs-content>

            <v-tabs-content key="network" id="tab-network">
              <v-card flat>
                <v-card-text>
                  <code-block height="100%" lang="json" :content="jsonDump"></code-block>
                </v-card-text>
              </v-card>
            </v-tabs-content>

          </v-tabs-items>
        </v-tabs>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native.stop="cancelClicked()">Cancel</v-btn>
        <v-btn flat @click.native.stop="createClicked()" :disabled="!valid" class="cyan--text">Create</v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<script>
  import { mapGetters, mapActions, mapState } from 'vuex'
  import WorkerInputGce from '@/components/WorkerInputGce'
  import WorkerInputAws from '@/components/WorkerInputAws'
  import WorkerInputAzure from '@/components/WorkerInputAzure'
  import WorkerInputOpenstack from '@/components/WorkerInputOpenstack'
  import find from 'lodash/find'
  import cloneDeep from 'lodash/cloneDeep'
  import every from 'lodash/every'
  import noop from 'lodash/noop'
  import { required, maxLength } from 'vuelidate/lib/validators'
  import CodeBlock from '@/components/CodeBlock'
  import InfraIcon from '@/components/InfrastructureIcon'
  import { setInputFocus } from '@/utils'

  var semSort = require('semver-sort')

  function shortRandomString (length) {
    const start = 'abcdefghijklmnopqrstuvwxyz'
    const possible = start + '0123456789'
    var text = start.charAt(Math.floor(Math.random() * start.length))
    for (var i = 0; i < (length - 1); i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  const defaultShootDefinition = {
    apiVersion: 'garden.sapcloud.io/v1',
    kind: 'Shoot',
    metadata: {
      name: null,
      namespace: null,
      annotations: {
        'garden.sapcloud.io/purpose': 'evaluation'
      }
    },
    spec: {
      dns: {
        kind: 'aws'
      },
      addons: {
        'cluster-autoscaler': {
          enabled: true
        },
        'heapster': {
          enabled: true
        },
        'kube-lego': {},
        'kube2iam': {},
        'kubernetes-dashboard': {
          enabled: true
        },
        'monocular': {
          enabled: false
        },
        'nginx-ingress': {
          enabled: true
        }
      },
      infrastructure: {
        kind: 'aws',
        region: null,
        secret: null
      },
      kubernetesVersion: null,
      networks: {
        workers: [
          '10.250.0.0/19'
        ],
        public: [],
        internal: []
      },
      workers: [
        {
          id: shortRandomString(10),
          name: 'cpu-worker',
          autoScalerMax: 5,
          autoScalerMin: 1,
          machineType: '',
          volumeSize: '50Gi',
          volumeType: ''
        }
      ],
      zones: []
    }
  }

  export default {
    name: 'create-cluster',
    components: {
      WorkerInputAws,
      WorkerInputAzure,
      WorkerInputGce,
      WorkerInputOpenstack,
      CodeBlock,
      InfraIcon
    },
    props: {
      value: {
        type: Boolean,
        required: false
      }
    },
    data () {
      return {
        shootDefinition: null,
        activeTab: 'tab-infra',
        purpose: ['evaluation', 'development', 'production'],
        refs_: {}
      }
    },
    validations: {
      shootDefinition: {
        metadata: {
          name: {
            required,
            maxLength: maxLength(10),
            valid (value) {
              return /^([a-z][a-z0-9-]*)$/.test(value)
            },
            unique (value) {
              return this.shoots.filter(shoot => shoot.metadata.name === value).length === 0
            }
          }
        },
        spec: {
          infrastructure: {
            secret: {
              required
            },
            region: {
              required
            }
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
        'infrastructureKindList',
        'kubernetesVersions',
        'infrastructureSecretNamesByInfrastructureKind',
        'regionsByInfrastructureKind',
        'machineTypesByInfrastructureKind',
        'volumeTypesByInfrastructureKind',
        'projectList'
      ]),
      ...mapState('shoots', {
        shoots: 'all'
      }),
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      region: {
        get () {
          return this.shootDefinition.spec.infrastructure.region
        },
        set (value) {
          this.shootDefinition.spec.infrastructure.region = value
          this.infraHandler.calcZone()
        }
      },
      shootDefinitionData () {
        return this.shootDefinition.spec || {}
      },
      infrastructure () {
        return this.shootDefinitionData.infrastructure || {}
      },
      addons () {
        return this.shootDefinitionData.addons || {}
      },
      infrastructureKind: {
        get () {
          return this.infrastructure.kind
        },
        set (value) {
          this.infrastructure.kind = value
          this.infraHandler.setDefaults()
        }
      },
      machineTypes () {
        return this.machineTypesByInfrastructureKind(this.infrastructureKind)
      },
      volumeTypes () {
        return this.volumeTypesByInfrastructureKind(this.infrastructureKind)
      },
      infrastructureKinds () {
        return this.infrastructureKindList
      },
      infrastructureRegions () {
        return this.regionsByInfrastructureKind(this.infrastructureKind)
      },
      infrastructureSecretNames () {
        return this.infrastructureSecretNamesByInfrastructureKind(this.infrastructureKind)
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
        return workersValid && !this.$v.$invalid
      },
      sortedKubernetesVersions () {
        return semSort.desc(this.kubernetesVersions.slice(0))
      },
      jsonDump () {
        return JSON.stringify({infra: this.infrastructure, zones: this.shootDefinition.spec.zones}, undefined, 2)
      },
      infraHandler () {
        switch (this.infrastructureKind) {
          case 'aws':
            return {
              calcZone: () => {
                const spec = this.shootDefinitionData
                spec.zones = [spec.infrastructure.region + 'a']
              },
              setDefaults: () => {
                const spec = this.shootDefinitionData
                // infrastructure
                delete spec.infrastructure.vnet
                delete spec.infrastructure.countUpdateDomains
                delete spec.infrastructure.countFaultDomains
                spec.infrastructure.secret = this.infrastructureSecretNames[0]
                spec.infrastructure.region = this.infrastructureRegions.slice(-1)[0]
                spec.infrastructure.vpc = { cidr: '10.250.0.0/16' }
                // zones
                spec.zones = [spec.infrastructure.region + 'a']
                // networks
                spec.networks.public = [
                  '10.250.96.0/22'
                ]
                spec.networks.internal = [
                  '10.250.112.0/22'
                ]
                // workers
                spec.workers.forEach(worker => {
                  worker.machineType = this.machineTypes[0]
                  worker.autoScalerMin = 1
                  worker.volumeType = this.volumeTypes[0]
                })
              }
            }
          case 'azure':
            return {
              calcZone: noop,
              setDefaults: () => {
                const spec = this.shootDefinitionData
                // infrastructure
                delete spec.infrastructure.vpc
                spec.infrastructure.secret = this.infrastructureSecretNames[0]
                spec.infrastructure.region = this.infrastructureRegions.slice(-1)[0]
                spec.infrastructure.vnet = { cidr: '10.250.0.0/16' }
                spec.infrastructure.countUpdateDomains = 5
                spec.infrastructure.countFaultDomains = 2
                // zones
                spec.zones = []
                // networks
                delete spec.networks.public
                delete spec.networks.internal
                // workers
                spec.workers.forEach(worker => {
                  worker.machineType = this.machineTypes[0]
                  worker.autoScalerMin = worker.autoScalerMax
                  worker.volumeType = this.volumeTypes[0]
                })
              }
            }
          case 'gce':
            return {
              calcZone: () => {
                const spec = this.shootDefinitionData
                spec.zones = [spec.infrastructure.region + '-b']
              },
              setDefaults: () => {
                const spec = this.shootDefinitionData
                // infrastructure
                delete spec.infrastructure.vpc
                delete spec.infrastructure.vnet
                delete spec.infrastructure.countUpdateDomains
                delete spec.infrastructure.countFaultDomains
                spec.infrastructure.secret = this.infrastructureSecretNames[0]
                spec.infrastructure.region = this.infrastructureRegions.slice(-1)[0]
                // zones
                spec.zones = [spec.infrastructure.region + '-b']
                // networks
                delete spec.networks.public
                delete spec.networks.internal
                // workers
                spec.workers.forEach(worker => {
                  worker.machineType = this.machineTypes[0]
                  worker.autoScalerMin = 1
                  worker.volumeType = this.volumeTypes[0]
                })
              }
            }
          case 'openstack':
            return {
              calcZone: noop,
              setDefaults: () => {
                const spec = this.shootDefinitionData
                // infrastructure
                delete spec.infrastructure.vpc
                delete spec.infrastructure.vnet
                delete spec.infrastructure.countUpdateDomains
                delete spec.infrastructure.countFaultDomains
                spec.infrastructure.secret = this.infrastructureSecretNames[0]
                spec.infrastructure.region = this.infrastructureRegions.slice(-1)[0]
                // zones
                spec.zones = ['rot_1']
                // networks
                delete spec.networks.public
                delete spec.networks.internal
                // workers
                spec.workers.forEach(worker => {
                  worker.machineType = this.machineTypes[0]
                  worker.autoScalerMin = worker.autoScalerMax = 2
                  worker.volumeType = this.volumeTypes[0]
                })
              }
            }
        }
      },
      projectName () {
        const predicate = item => item.metadata.namespace === this.namespace
        const project = find(this.projectList, predicate)
        return project ? project.metadata.name : ''
      }
    },
    methods: {
      ...mapActions([
        'createShoot'
      ]),
      createShootResource () {
        const data = cloneDeep(this.shootDefinition)
        data.spec.workers.forEach(worker => {
          delete worker.id
        })
        this
          .createShoot(data)
          .then(() => this.$emit('created'))
          .catch(err => console.error('Failed to create Shoot Cluster', err))
      },
      addWorker () {
        const id = shortRandomString(5)
        this.shootDefinition.spec.workers.push({
          id,
          name: `worker-${id}`,
          autoScalerMax: 5,
          autoScalerMin: 5,
          machineType: this.machineTypes[0],
          volumeSize: '50Gi',
          volumeType: this.volumeTypes[0]
        })
      },
      createClicked () {
        this.shootDefinition.spec.dns.domain = this.shootDefinition.metadata.name + '.' + this.projectName + '.k8s.sapcloud.io'
        this.createShootResource()
        this.$emit('close', false)
      },
      cancelClicked () {
        this.$emit('close', true)
      },
      reset () {
        this.activeTab = 'tab-infra'

        this.shootDefinition = cloneDeep(defaultShootDefinition)
        this.shootDefinition.spec.kubernetesVersion = this.sortedKubernetesVersions[0]
        this.infraHandler.setDefaults()

        const metadata = this.shootDefinition.metadata
        metadata.name = shortRandomString(10)
        metadata.namespace = this.namespace

        setInputFocus(this, 'name')
      },
      nameErrors () {
        const errors = []
        if (!this.$v.shootDefinition.metadata.name.required) {
          errors.push('Name is required')
        }
        if (!this.$v.shootDefinition.metadata.name.valid) {
          errors.push('Name must only be lowercase letters, numbers, and hyphens')
        }
        if (!this.$v.shootDefinition.metadata.name.maxLength) {
          errors.push('name ist too long')
        }
        if (!this.$v.shootDefinition.metadata.name.unique) {
          errors.push('cluster name must be unique')
        }
        return errors
      },
      secretErrors () {
        const errors = []
        if (!this.$v.shootDefinition.spec.infrastructure.secret.required) {
          errors.push('secret is required')
        }
        return errors
      },
      regionErrors () {
        const errors = []
        if (!this.$v.shootDefinition.spec.infrastructure.region.required) {
          errors.push('region is required')
        }
        return errors
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
      this.reset()
    },
    mounted () {
      this.refs_ = this.$refs
    }
  }
</script>

<style lang="styl" >

  .dialogContainer{

    .header {
      background-image: url(../assets/cluster_background.svg);
      background-size: cover;
      color:white;
      padding-top:10px;
      .tabs__bar {
        background-color:rgba(255,255,255,0.1)
      }
      span{
        font-size:25px !important
        padding-left:30px
        font-weight:400 !important
        padding-top:15px !important
      }
      .icon {
        font-size: 50px !important;
      }
    }

    .card__text{
      padding:0;
    }

    .tabs__items {
      margin: 10px;
      height:350px !important;
      .tabs__content {
        height:100%;
        overflow:auto;
      }
    }

    .input-group{
      label{
        overflow:visible;
      }
    }

    .list-complete-item {
      transition: all 0.5s;
    }

    .add_worker{
      margin-left:30px;
      border:0;
    }

    .list-complete-enter, .list-complete-leave-to {
      opacity: 0;
      transform: translateY(20px);
    }

    .list-complete-leave-active {
      position: absolute;
    }
  }

</style>
