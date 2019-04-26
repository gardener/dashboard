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


<script>
import { mapGetters, mapActions, mapState } from 'vuex'
import CloudProfile from '@/components/CloudProfile'

import Alert from '@/components/Alert'
import find from 'lodash/find'
import get from 'lodash/get'
import head from 'lodash/head'
import sortBy from 'lodash/sortBy'
import map from 'lodash/map'
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
import { setDelayedInputFocus, isOwnSecretBinding, getValidationErrors,  } from '@/utils'
import { errorDetailsFromError } from '@/utils/error'

export default {
  name: 'create-shoot-dialog',
  components: {
    Alert,
    CloudProfile
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
      selectedSecret: undefined, // pragma: whitelist secret
      selectedInfrastructureKind: undefined,
      activeTab: 'tab-infra',
      purposes: ['evaluation', 'development', 'production'],
      refs_: {},
      validationErrors,
      maintenanceTimeValid: false,
      hibernationScheduleValid: false,
      workersValid: false,
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
      'namespace',
      'localTimezone'
    ]),
    ...mapGetters([
      'infrastructureSecretsByInfrastructureKind',
      'domainList',
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

        this.selectedSecret = secret // pragma: whitelist secret

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
    purpose: {
      get () {
        return this.shootDefinition.metadata.annotations['garden.sapcloud.io/purpose']
      },
      set (purpose) {
        this.shootDefinition.metadata.annotations['garden.sapcloud.io/purpose'] = purpose
        this.setDefaultHibernationSchedule()
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
    addons () {
      return get(this.shootDefinition, 'spec.addons', {})
    },
    infrastructureSecretsByKind () {
      return this.infrastructureSecretsByInfrastructureKind(this.infrastructureKind)
    },
    infrastructureSecretsByProfileName () {
      return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
    },
    valid () {
      return this.workersValid && this.maintenanceTimeValid && this.hibernationScheduleValid && !this.$v.$invalid
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



  },
  methods: {
    ...mapActions([
      'createShoot'
    ]),
    get (object, path, defaultValue) {
      return get(object, path, defaultValue)
    },

    createShootResource () {
      const data = cloneDeep(this.shootDefinition)
      const annotations = data.metadata.annotations
      const infrastructureData = cloneDeep(this.infrastructureData)
      const workers = this.$refs.manageWorkers.getWorkers()
      infrastructureData.workers = workers
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
      const hibernationSchedules = this.$refs.hibernationSchedule.getScheduleCrontab()
      if (!isEmpty(hibernationSchedules)) {
        data.spec.hibernation = {
          schedules: hibernationSchedules
        }
      } else if (this.$refs.hibernationSchedule.getNoHibernationSchedule()) {
        annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule'] = 'true'
      }
      return this.createShoot(data)
    },

    reset () {
      this.$v.$touch()

      this.activeTab = 'tab-infra'

      this.selectedSecret = undefined // pragma: whitelist secret
      this.shootDefinition = cloneDeep(defaultShootDefinition)

      this.setDefaultInfrastructureKind()

      this.clusterName = shortRandomString(10)
      this.shootDefinition.metadata.namespace = this.namespace

      this.$nextTick(() => {
        this.$refs.maintenanceTime.reset()
        this.$refs.hibernationSchedule.reset()

        this.setDefaultMaintenanceTimeWindow()
        this.setDefaultHibernationSchedule()
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
      this.purpose = head(this.filteredPurposes)
    },
    setDefaultHibernationSchedule () {
      this.$nextTick(() => {
        this.$refs.hibernationSchedule.setDefaultHibernationSchedule()
      })
    },
    setDefaultMaintenanceTimeWindow () {
      this.$refs.maintenanceTime.setDefaultMaintenanceTimeWindow()
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
      this.$nextTick(() => {
        this.$refs.manageWorkers.setDefaultWorker()
      })
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

  },
  watch: {
    value (newValue) {
      if (newValue === true) {
        this.reset()
      }
    }
  },
  created () {
    // add custom add-ons to default shootDefinition
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
  }

</style>
