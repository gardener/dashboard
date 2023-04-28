
<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regularInput">
        <v-text-field
          color="primary"
          :error-messages="getErrorMessages('worker.name')"
          @update:model-value="onInputName"
          @blur="$v.worker.name.$touch()"
          v-model="worker.name"
          counter="15"
          label="Group Name">
        </v-text-field>
      </div>
      <div class="smallInput">
        <v-select
          color="primary"
          item-color="primary"
          :items="machineArchitectures"
          :error-messages="getErrorMessages('machineArchitecture')"
          @blur="$v.machineArchitecture.$touch()"
          v-model="machineArchitecture"
          label="Architecture">
        </v-select>
      </div>
      <div class="regularInput">
        <machine-type
          :machine-types="machineTypes"
          v-model="machineTypeValue"
          v-model:valid="internalMachineTypeValid"
        ></machine-type>
      </div>
      <div class="regularInput">
        <machine-image
        :machine-images="machineImages"
        :worker="worker"
        :machine-type="selectedMachineType"
        :updateOSMaintenance="updateOSMaintenance"
        @update-machine-image="onUpdateMachineImage"
        @valid="onMachineImageValid">
        </machine-image>
      </div>
      <div class="regularInput">
        <container-runtime
          :machine-image-cri="machineImageCri"
          :worker="worker"
          :kubernetes-version="kubernetesVersion"
          @valid="onContainerRuntimeValid">
        </container-runtime>
      </div>
      <div v-if="volumeInCloudProfile" class="regularInput">
        <volume-type
        :volume-types="volumeTypes"
        :worker="worker"
        :cloud-profile-name="cloudProfileName"
        @update-volume-type="onUpdateVolumeType"
        @valid="onVolumeTypeValid">
        </volume-type>
      </div>
      <div v-if="canDefineVolumeSize" class="smallInput">
        <size-input
          :min="minimumVolumeSize"
          color="primary"
          :error-messages="getErrorMessages('volumeSize')"
          @input="onInputVolumeSize"
          @blur="$v.volumeSize.$touch()"
          label="Volume Size"
          v-model="volumeSize"
        ></size-input>
      </div>
      <div class="smallInput">
        <v-text-field
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.minimum')"
          @update:model-value="onInputminimum"
          @blur="$v.worker.minimum.$touch()"
          type="number"
          v-model="innerMin"
          label="Autoscaler Min."></v-text-field>
      </div>
      <div class="smallInput">
        <v-text-field
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.maximum')"
          @update:model-value="onInputmaximum"
          @blur="$v.worker.maximum.$touch()"
          type="number"
          v-model="innerMax"
          label="Autoscaler Max."
        ></v-text-field>
      </div>
      <div class="smallInput">
        <v-text-field
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.maxSurge')"
          @update:model-value="onInputMaxSurge"
          @blur="$v.worker.maxSurge.$touch()"
          v-model="maxSurge"
          label="Max. Surge"></v-text-field>
      </div>

      <div class="regularInput" v-if="zonedCluster">
        <v-select
          color="primary"
          item-color="primary"
          label="Zone"
          :items="zoneItems"
          :error-messages="getErrorMessages('selectedZones')"
          v-model="selectedZones"
          @update:model-value="onInputZones"
          @blur="$v.selectedZones.$touch()"
          multiple
          chips
          closable-chips
          small-chips
          :hint="zoneHint"
          persistent-hint
          ></v-select>
      </div>
    </div>
    <div class="ml-4 mr-2">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import SizeInput from '@/components/ShootWorkers/VolumeSizeInput.vue'
import MachineType from '@/components/ShootWorkers/MachineType.vue'
import VolumeType from '@/components/ShootWorkers/VolumeType.vue'
import MachineImage from '@/components/ShootWorkers/MachineImage.vue'
import ContainerRuntime from '@/components/ShootWorkers/ContainerRuntime.vue'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import map from 'lodash/map'
import includes from 'lodash/includes'
import sortBy from 'lodash/sortBy'
import find from 'lodash/find'
import concat from 'lodash/concat'
import last from 'lodash/last'
import difference from 'lodash/difference'
import get from 'lodash/get'
import set from 'lodash/set'
import head from 'lodash/head'
import pick from 'lodash/pick'
import { required, maxLength, minValue, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, parseSize } from '@/utils'
import { uniqueWorkerName, resourceName, noStartEndHyphen, numberOrPercentage } from '@/utils/validators'

const validationErrors = {
  worker: {
    name: {
      required: 'Name is required',
      maxLength: 'Name is too long',
      resourceName: 'Name must only be lowercase letters, numbers and hyphens',
      uniqueWorkerName: 'Name is taken. Try another.',
      noStartEndHyphen: 'Name must not start or end with a hyphen'
    },
    minimum: {
      minValue: 'Invalid value'
    },
    maximum: {
      minValue: 'Invalid value'
    },
    maxSurge: {
      numberOrPercentage: 'Invalid value'
    }
  },
  selectedZones: {
    required: 'Zone is required'
  },
  volumeSize: {
    minVolumeSize: 'Invalid volume size'
  },
  machineArchitecture: {
    required: 'Machine Architecture is required'
  }
}

export default {
  components: {
    SizeInput,
    MachineType,
    VolumeType,
    MachineImage,
    ContainerRuntime
  },
  props: {
    worker: {
      type: Object,
      required: true
    },
    workers: {
      type: Array,
      required: true
    },
    cloudProfileName: {
      type: String
    },
    region: {
      type: String
    },
    allZones: {
      type: Array
    },
    availableZones: {
      type: Array
    },
    zonedCluster: {
      type: Boolean
    },
    updateOSMaintenance: {
      type: Boolean
    },
    isNew: {
      type: Boolean
    },
    maxAdditionalZones: {
      type: Number
    },
    initialZones: {
      type: Array
    },
    kubernetesVersion: {
      type: String
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      machineTypeValid: undefined,
      volumeTypeValid: true, // selection not shown in all cases, default to true
      machineImageValid: undefined,
      containerRuntimeValid: undefined,
      immutableZones: undefined,
      volumeSize: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileNameAndRegionAndArchitecture',
      'machineArchitecturesByCloudProfileNameAndRegion',
      'volumeTypesByCloudProfileNameAndRegion',
      'machineImagesByCloudProfileName',
      'minimumVolumeSizeByCloudProfileNameAndRegion'
    ]),
    validators () {
      return {
        worker: {
          name: {
            required,
            maxLength: maxLength(15),
            noStartEndHyphen, // Order is important for UI hints
            resourceName,
            uniqueWorkerName
          },
          minimum: {
            minValue: minValue(0)
          },
          maximum: {
            minValue: minValue(0)
          },
          maxSurge: {
            numberOrPercentage
          }
        },
        selectedZones: {
          required: requiredIf(function () {
            return this.zonedCluster
          })
        },
        volumeSize: {
          minVolumeSize (value) {
            if (!this.canDefineVolumeSize) {
              return true
            }
            if (!value) {
              return false
            }
            return minValue(this.minimumVolumeSize)(parseSize(value))
          }
        },
        machineArchitecture: {
          required
        }
      }
    },
    machineTypes () {
      return this.machineTypesByCloudProfileNameAndRegionAndArchitecture({
        cloudProfileName: this.cloudProfileName,
        region: this.region,
        architecture: this.worker.machine.architecture
      })
    },
    machineArchitectures () {
      return this.machineArchitecturesByCloudProfileNameAndRegion({
        cloudProfileName: this.cloudProfileName,
        region: this.region
      })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileNameAndRegion({
        cloudProfileName: this.cloudProfileName,
        region: this.region
      })
    },
    volumeInCloudProfile () {
      return !isEmpty(this.volumeTypes)
    },
    selectedMachineType () {
      return find(this.machineTypes, ['name', this.worker.machine.type])
    },
    canDefineVolumeSize () {
      // Volume size can be configured by the user if the volume type is defined via a volume type (volumeInCloudProfile)
      // not via machine type storage. If defined via storage with type not 'fixed' or if no storage is present, then the
      // user is allowed to set a volume size
      if (this.volumeInCloudProfile) {
        return true
      }
      return get(this.selectedMachineType, 'storage.type') !== 'fixed'
    },
    machineImages () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const architecture = this.worker.machine.architecture
      return filter(machineImages, ({ isExpired, architectures }) => !isExpired && includes(architectures, architecture))
    },
    minimumVolumeSize () {
      const minimumVolumeSize = parseSize(this.minimumVolumeSizeByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region }))

      const defaultSize = parseSize(get(this.selectedMachineType, 'storage.size'))
      if (defaultSize > 0 && defaultSize < minimumVolumeSize) {
        return defaultSize
      }

      return minimumVolumeSize
    },
    innerMin: {
      get: function () {
        return Math.max(0, this.worker.minimum)
      },
      set: function (value) {
        this.worker.minimum = Math.max(0, parseInt(value))
        if (this.innerMax < this.worker.minimum) {
          this.worker.maximum = this.worker.minimum
        }
      }
    },
    innerMax: {
      get: function () {
        return Math.max(0, this.worker.maximum)
      },
      set: function (value) {
        this.worker.maximum = Math.max(0, parseInt(value))
        if (this.innerMin > this.worker.maximum) {
          this.worker.minimum = this.worker.maximum
        }
      }
    },
    maxSurge: {
      get: function () {
        return this.worker.maxSurge
      },
      set: function (maxSurge) {
        if (/^[\d]+$/.test(maxSurge)) {
          this.worker.maxSurge = parseInt(maxSurge)
        } else {
          this.worker.maxSurge = maxSurge
        }
      }
    },
    selectedZones: {
      get () {
        // As this.worker.zones may contain duplicates, value property of items must be transformed to a unique value
        return map(this.worker.zones, (zone, index) => {
          return {
            value: [index, zone],
            text: zone,
            disabled: includes(this.immutableZones, zone)
          }
        })
      },
      set (zoneValues) {
        const zones = map(zoneValues, last)
        const removedZones = difference(this.worker.zones, zones)
        this.worker.zones = zones
        if (removedZones.length) {
          this.$emit('removed-zones', removedZones)
        }
      }
    },
    unselectedZones () {
      // Transform the remaining unselected zonesto the same item structure as in selectedZones
      const unselectedZones = difference(this.allZones, this.worker.zones)
      return map(unselectedZones, (zone, index) => {
        return {
          value: [index, zone],
          text: zone,
          disabled: !includes(this.availableZones, zone)
        }
      })
    },
    zoneItems () {
      // items must contain all currently seclect zones (including duplicates) as well as the the currently unselected ones
      return sortBy(concat(this.selectedZones, this.unselectedZones), 'text')
    },
    zoneHint () {
      if (this.maxAdditionalZones >= this.availableZones.length) {
        return undefined
      }
      if (this.maxAdditionalZones === 0) {
        return 'Your network configuration does not allow to add more zones that are not already used by this cluster'
      }
      if (this.maxAdditionalZones === 1) {
        return 'Your network configuration allows to add one more zone that is not already used by this cluster'
      }
      if (this.maxAdditionalZones > 1) {
        return `Your network configuration allows to add ${this.maxAdditionalZones} more zones that are not already used by this cluster`
      }
      return undefined
    },
    selectedMachineImage () {
      return find(this.machineImages, this.worker.machine.image)
    },
    machineImageCri () {
      return get(this.selectedMachineImage, 'cri')
    },
    machineArchitecture: {
      get () {
        return this.worker.machine.architecture
      },
      set (architecture) {
        this.worker.machine.architecture = architecture

        // Reset machine type and image to default as they won't be supported by new architecture
        this.resetWorkerMachine()
      }
    },
    machineTypeValue: {
      get () {
        return this.worker.machine.type
      },
      set (value) {
        this.worker.machine.type = value
        this.setVolumeDependingOnMachineType()
        this.onInputVolumeSize()
        this.validateInput()
      }
    },
    internalMachineTypeValid: {
      get () {
        return this.machineTypeValid
      },
      set (value) {
        if (this.machineTypeValid !== value) {
          this.machineTypeValid = value
          this.validateInput()
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputName () {
      this.$v.worker.name.$touch()
      this.validateInput()
    },
    onUpdateVolumeType () {
      this.validateInput()
    },
    onInputVolumeSize () {
      const machineType = this.selectedMachineType
      if (!this.canDefineVolumeSize ||
        (!this.worker.volume?.type && this.volumeSize && get(machineType, 'storage.size') === this.volumeSize)) {
        // this can only happen if volume type is defined via machine type storage (canDefineVolumeSize would return true otherwise)
        // if the selected machine type does not allow to set a volume size (storage type fixed) or if the selected size is euqal
        // to the default storage size defined for this machine type, remove volume object (contains only size information which
        // is redundant / not allowed in this case)
        // also the empty volume object defined by the worker skeleton gets deleted in this case
        delete this.worker.volume
      } else {
        set(this.worker, 'volume.size', this.volumeSize)
      }
      this.$v.volumeSize.$touch()
      this.validateInput()
    },
    onInputminimum () {
      this.$v.worker.minimum.$touch()
      this.validateInput()
    },
    onInputmaximum () {
      this.$v.worker.maximum.$touch()
      this.validateInput()
    },
    onUpdateMachineImage () {
      this.validateInput()
    },
    onInputMaxSurge () {
      this.$v.worker.maxSurge.$touch()
      this.$emit('update-max-surge', { maxSurge: this.worker.maxSurge, id: this.worker.id })
      this.validateInput()
    },
    onInputZones () {
      this.$v.selectedZones.$touch()
      this.validateInput()
    },
    onVolumeTypeValid ({ valid }) {
      if (this.volumeTypeValid !== valid) {
        this.volumeTypeValid = valid
        this.validateInput()
      }
    },
    onMachineImageValid ({ valid }) {
      if (this.machineImageValid !== valid) {
        this.machineImageValid = valid
        this.validateInput()
      }
    },
    onContainerRuntimeValid ({ valid }) {
      if (this.containerRuntimeValid !== valid) {
        this.containerRuntimeValid = valid
        this.validateInput()
      }
    },
    validateInput () {
      const valid = !this.$v.$invalid && this.machineTypeValid && this.volumeTypeValid && this.machineImageValid && this.containerRuntimeValid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    },
    setVolumeDependingOnMachineType () {
      const storage = get(this.selectedMachineType, 'storage')
      if (!storage) {
        return
      }
      // machine type has storage
      if (get(this.worker, 'volume.size')) {
        return
      }
      // volume size is not defined on worker (=default storage size)
      if (storage.type !== 'fixed') {
        // storage can be defined, set volumeSize (=displayed size in size-input) to default storage size
        this.volumeSize = storage.size
      }
    },
    resetWorkerMachine () {
      this.worker.machine.type = get(head(this.machineTypes), 'name')
      const machineImage = head(this.machineImages)
      this.worker.machine.image = pick(machineImage, ['name', 'version'])
    }
  },
  mounted () {
    this.validateInput()
    const volumeSize = get(this.worker, 'volume.size')
    if (volumeSize) {
      this.volumeSize = volumeSize
    }
    this.setVolumeDependingOnMachineType()
    this.onInputVolumeSize()
    this.immutableZones = this.isNew ? [] : this.initialZones
  }
}
</script>

<style lang="scss" scoped>
  .regularInput {
    max-width: 300px;
    flex: 1 1 auto;
    padding: 12px;
  }
  .smallInput {
    max-width: 120px;
    flex: 1 1 auto;
    padding: 12px;
  }

  :deep(.v-list-item--disabled) {
    opacity:0.5;
  }

  :deep(.v-chip--disabled) {
    opacity: 1;
  }
</style>
