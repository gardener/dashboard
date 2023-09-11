<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regularInput">
        <v-text-field
          v-model="worker.name"
          color="primary"
          :error-messages="getErrorMessages('worker.name')"
          counter="15"
          label="Group Name"
          variant="underlined"
          @input="onInputName"
          @blur="v$.worker.name.$touch()"
        />
      </div>
      <div class="smallInput">
        <v-select
          v-model="machineArchitecture"
          color="primary"
          item-color="primary"
          :items="machineArchitectures"
          :error-messages="getErrorMessages('machineArchitecture')"
          label="Architecture"
          variant="underlined"
          @blur="v$.machineArchitecture.$touch()"
        />
      </div>
      <div class="regularInput">
        <g-machine-type
          v-model="machineTypeValue"
          :machine-types="machineTypes"
        />
      </div>
      <div class="regularInput">
        <g-machine-image
          :machine-images="machineImages"
          :worker="worker"
          :machine-type="selectedMachineType"
          :update-o-s-maintenance="updateOSMaintenance"
        />
      </div>
      <div class="regularInput">
        <g-container-runtime
          :machine-image-cri="machineImageCri"
          :worker="worker"
          :kubernetes-version="kubernetesVersion"
        />
      </div>
      <div
        v-if="volumeInCloudProfile"
        class="regularInput"
      >
        <g-volume-type
          :volume-types="volumeTypes"
          :worker="worker"
          :cloud-profile-name="cloudProfileName"
        />
      </div>
      <div
        v-if="canDefineVolumeSize"
        class="smallInput"
      >
        <g-volume-size-input
          v-model="volumeSize"
          :min="minimumVolumeSize"
          color="primary"
          :error-messages="getErrorMessages('volumeSize')"
          label="Volume Size"
          @update:model-value="onInputVolumeSize"
          @blur="v$.volumeSize.$touch()"
        />
      </div>
      <div class="smallInput">
        <v-text-field
          v-model="innerMin"
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.minimum')"
          type="number"
          label="Autoscaler Min."
          variant="underlined"
          @input="onInputMinimum"
          @blur="v$.worker.minimum.$touch()"
        />
      </div>
      <div class="smallInput">
        <v-text-field
          v-model="innerMax"
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.maximum')"
          type="number"
          label="Autoscaler Max."
          variant="underlined"
          @input="onInputMaximum"
          @blur="v$.worker.maximum.$touch()"
        />
      </div>
      <div class="smallInput">
        <v-text-field
          v-model="maxSurge"
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.maxSurge')"
          label="Max. Surge"
          variant="underlined"
          @input="onInputMaxSurge"
          @blur="v$.worker.maxSurge.$touch()"
        />
      </div>

      <div
        v-if="zonedCluster"
        class="regularInput"
      >
        <v-select
          v-model="selectedZones"
          color="primary"
          item-color="primary"
          label="Zone"
          :items="zoneItems"
          :error-messages="getErrorMessages('selectedZones')"
          multiple
          chips
          closable-chips
          :hint="zoneHint"
          persistent-hint
          item-title="text"
          variant="underlined"
          @update:model-value="onInputZones"
          @blur="v$.selectedZones.$touch()"
        >
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :disabled="item.raw.disabled"
            />
          </template>
        </v-select>
      </div>
    </div>
    <div class="ml-4 mr-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script>
import { mapActions } from 'pinia'
import {
  required,
  maxLength,
  minValue,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GVolumeSizeInput from '@/components/ShootWorkers/GVolumeSizeInput'
import GMachineType from '@/components/ShootWorkers/GMachineType'
import GVolumeType from '@/components/ShootWorkers/GVolumeType'
import GMachineImage from '@/components/ShootWorkers/GMachineImage'
import GContainerRuntime from '@/components/ShootWorkers/GContainerRuntime'

import {
  getValidationErrors,
  parseSize,
} from '@/utils'
import {
  uniqueWorkerName,
  resourceName,
  noStartEndHyphen,
  numberOrPercentage,
} from '@/utils/validators'

import {
  isEmpty,
  filter,
  map,
  includes,
  sortBy,
  find,
  concat,
  last,
  difference,
  get,
  set,
  head,
  pick,
} from '@/lodash'

const validationErrors = {
  worker: {
    name: {
      required: 'Name is required',
      maxLength: 'Name is too long',
      resourceName: 'Name must only be lowercase letters, numbers and hyphens',
      uniqueWorkerName: 'Name is taken. Try another.',
      noStartEndHyphen: 'Name must not start or end with a hyphen',
    },
    minimum: {
      minValue: 'Invalid value',
    },
    maximum: {
      minValue: 'Invalid value',
      systemComponents: 'Value must be greater or equal to the number of zones configured for this pool',
    },
    maxSurge: {
      numberOrPercentage: 'Invalid value',
    },
  },
  selectedZones: {
    required: 'Zone is required',
  },
  volumeSize: {
    minVolumeSize: 'Invalid volume size',
  },
  machineArchitecture: {
    required: 'Machine Architecture is required',
  },
}

export default {
  components: {
    GVolumeSizeInput,
    GMachineType,
    GVolumeType,
    GMachineImage,
    GContainerRuntime,
  },
  props: {
    worker: {
      type: Object,
      required: true,
    },
    workers: {
      type: Array,
      required: true,
    },
    cloudProfileName: {
      type: String,
    },
    region: {
      type: String,
    },
    allZones: {
      type: Array,
    },
    availableZones: {
      type: Array,
    },
    zonedCluster: {
      type: Boolean,
    },
    updateOSMaintenance: {
      type: Boolean,
    },
    isNew: {
      type: Boolean,
    },
    maxAdditionalZones: {
      type: Number,
    },
    initialZones: {
      type: Array,
    },
    kubernetesVersion: {
      type: String,
    },
  },
  emits: [
    'removedZones',
    'updateMaxSurge',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      validationErrors,
      immutableZones: undefined,
      volumeSize: undefined,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        worker: {
          name: {
            required,
            maxLength: maxLength(15),
            noStartEndHyphen, // Order is important for UI hints
            resourceName,
            uniqueWorkerName,
          },
          minimum: {
            minValue: minValue(0),
          },
          maximum: {
            minValue: minValue(0),
            systemComponents: (value) => {
              if (!this.hasSystemComponents) {
                return true
              }
              const zones = get(this.worker, 'zones.length', 0)
              return value >= zones
            },
          },
          maxSurge: {
            numberOrPercentage,
          },
        },
        selectedZones: {
          required: requiredIf(function () {
            return this.zonedCluster
          }),
        },
        volumeSize: {
          minVolumeSize (value) {
            if (!this.canDefineVolumeSize) {
              return true
            }
            if (!value) {
              return false
            }
            return this.minimumVolumeSize <= parseSize(value)
          },
        },
        machineArchitecture: {
          required,
        },
      }
    },
    machineTypes () {
      return this.machineTypesByCloudProfileNameAndRegionAndArchitecture({
        cloudProfileName: this.cloudProfileName,
        region: this.region,
        architecture: this.worker.machine.architecture,
      })
    },
    machineArchitectures () {
      return this.machineArchitecturesByCloudProfileNameAndRegion({
        cloudProfileName: this.cloudProfileName,
        region: this.region,
      })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileNameAndRegion({
        cloudProfileName: this.cloudProfileName,
        region: this.region,
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
      },
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
      },
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
      },
    },
    selectedZones: {
      get () {
        // As this.worker.zones may contain duplicates, value property of items must be transformed to a unique value
        return map(this.worker.zones, (zone, index) => {
          return {
            value: [index, zone],
            text: zone,
            disabled: includes(this.immutableZones, zone),
          }
        })
      },
      set (zoneValues) {
        const zones = map(zoneValues, last)
        const removedZones = difference(this.worker.zones, zones)
        this.worker.zones = zones
        if (removedZones.length) {
          this.$emit('removedZones', removedZones)
        }
      },
    },
    unselectedZones () {
      // Transform the remaining unselected zonesto the same item structure as in selectedZones
      const unselectedZones = difference(this.allZones, this.worker.zones)
      return map(unselectedZones, (zone, index) => {
        return {
          value: [index, zone],
          text: zone,
          disabled: !includes(this.availableZones, zone),
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
      },
    },
    machineTypeValue: {
      get () {
        return this.worker.machine.type
      },
      set (value) {
        this.worker.machine.type = value
        this.setVolumeDependingOnMachineType()
        this.onInputVolumeSize()
      },
    },
    hasSystemComponents () {
      return get(this.worker, 'systemComponents.allow', true)
    },
  },
  mounted () {
    const volumeSize = get(this.worker, 'volume.size')
    if (volumeSize) {
      this.volumeSize = volumeSize
    }
    this.setVolumeDependingOnMachineType()
    this.onInputVolumeSize()
    this.immutableZones = this.isNew ? [] : this.initialZones
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineTypesByCloudProfileNameAndRegionAndArchitecture',
      'machineArchitecturesByCloudProfileNameAndRegion',
      'volumeTypesByCloudProfileNameAndRegion',
      'machineImagesByCloudProfileName',
      'minimumVolumeSizeByCloudProfileNameAndRegion',
    ]),
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputName () {
      this.v$.worker.name.$touch()
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
      this.v$.volumeSize.$touch()
    },
    onInputMinimum () {
      this.v$.worker.minimum.$touch()
    },
    onInputMaximum () {
      this.v$.worker.maximum.$touch()
    },
    onInputMaxSurge () {
      this.v$.worker.maxSurge.$touch()
      this.$emit('updateMaxSurge', { maxSurge: this.worker.maxSurge, id: this.worker.id })
    },
    onInputZones () {
      this.v$.selectedZones.$touch()
      this.v$.worker.maximum.$touch()
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
        // storage can be defined, set volumeSize (=displayed size in g-size-input) to default storage size
        this.volumeSize = storage.size
      }
    },
    resetWorkerMachine () {
      this.worker.machine.type = get(head(this.machineTypes), 'name')
      const machineImage = head(this.machineImages)
      this.worker.machine.image = pick(machineImage, ['name', 'version'])
    },
  },
}
</script>

<style lang="scss" scoped>
  .regularInput {
    max-width: 300px;
    min-width: 230px;
    flex: 1 1 auto;
    padding: 12px;
  }
  .smallInput {
    max-width: 120px;
    min-width: 112px;
    flex: 1 1 auto;
    padding: 12px;
  }

  :deep(.v-chip--disabled) {
    opacity: 1;
  }
</style>
