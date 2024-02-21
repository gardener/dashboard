<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regular-input">
        <v-text-field
          v-model="worker.name"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.name)"
          counter="15"
          label="Group Name"
          variant="underlined"
          @input="onInputName"
          @blur="v$.worker.name.$touch()"
        />
      </div>
      <div class="small-input">
        <v-select
          v-model="machineArchitecture"
          color="primary"
          item-color="primary"
          :items="machineArchitectures"
          :error-messages="getErrorMessages(v$.machineArchitecture)"
          label="Architecture"
          variant="underlined"
          @blur="v$.machineArchitecture.$touch()"
        />
      </div>
      <div class="regular-input">
        <g-machine-type
          v-model="machineTypeValue"
          :machine-types="machineTypes"
          :field-name="`${workerGroupName} Machine Type`"
        />
      </div>
      <div class="regular-input">
        <g-machine-image
          :machine-images="machineImages"
          :worker="worker"
          :machine-type="selectedMachineType"
          :update-o-s-maintenance="updateOSMaintenance"
          :field-name="`${workerGroupName} Machine Image`"
        />
      </div>
      <div class="regular-input">
        <g-container-runtime
          :machine-image-cri="machineImageCri"
          :worker="worker"
          :kubernetes-version="kubernetesVersion"
          :field-name="`${workerGroupName} Container Runtime`"
        />
      </div>
      <div
        v-if="volumeInCloudProfile"
        class="regular-input"
      >
        <g-volume-type
          :volume-types="volumeTypes"
          :worker="worker"
          :cloud-profile-name="cloudProfileName"
          :field-name="`${workerGroupName} Volume Type`"
        />
      </div>
      <div :class="volumeInCloudProfile ? 'small-input' : 'regular-input'">
        <g-volume-size-input
          v-model="volumeSize"
          v-model:has-custom-storage-size="hasCustomStorageSize"
          :min="minimumVolumeSize"
          :default-storage-size="selectedMachineType.storage?.size"
          :has-volume-types="volumeInCloudProfile"
          color="primary"
          :error-messages="getErrorMessages(v$.volumeSize)"
          @update:custom-storage="onInputVolumeSize"
          @update:model-value="onInputVolumeSize"
          @blur="v$.volumeSize.$touch()"
        />
      </div>
      <div class="small-input">
        <v-text-field
          v-model="innerMin"
          min="0"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.minimum)"
          type="number"
          label="Autoscaler Min."
          variant="underlined"
          @input="onInputMinimum"
          @blur="v$.worker.minimum.$touch()"
        />
      </div>
      <div class="small-input">
        <v-text-field
          v-model="innerMax"
          min="0"
          color="primary"
          type="number"
          label="Autoscaler Max."
          variant="underlined"
          :error-messages="getErrorMessages(v$.worker.maximum)"
          @input="onInputMaximum"
          @blur="v$.worker.maximum.$touch()"
        />
      </div>
      <div class="small-input">
        <v-text-field
          v-model="maxSurge"
          min="0"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.maxSurge)"
          label="Max. Surge"
          variant="underlined"
          @input="onInputMaxSurge"
          @blur="v$.worker.maxSurge.$touch()"
        />
      </div>

      <div
        v-if="zonedCluster"
        class="regular-input"
      >
        <v-select
          v-model="selectedZones"
          color="primary"
          item-color="primary"
          label="Zones"
          :items="zoneItems"
          :error-messages="getErrorMessages(v$.selectedZones)"
          multiple
          chips
          closable-chips
          :hint="zoneHint"
          persistent-hint
          item-title="text"
          variant="underlined"
          @update:model-value="onInputZones"
          @blur="v$.selectedZones.$touch()"
        />
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
  withFieldName,
  uniqueWorkerName,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
  numberOrPercentage,
  withMessage,
} from '@/utils/validators'
import {
  getErrorMessages,
  parseSize,
} from '@/utils'

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
      immutableZones: undefined,
      volumeSize: undefined,
      hasCustomStorageSize: false,
    }
  },
  validations () {
    const rules = { worker: {} }

    const nameRules = {
      required,
      maxLength: maxLength(15),
      lowerCaseAlphaNumHyphen,
      noStartEndHyphen,
      uniqueWorkerName,
    }
    rules.worker.name = withFieldName(() => `${this.workerGroupName} Name`, nameRules)

    rules.worker.minimum = withFieldName(() => `${this.workerGroupName} Autoscaler Min.`, {
      minValue: minValue(0),
    })

    const maximumRules = {
      minValue: minValue(0),
      systemComponents: withMessage('Value must be greater or equal to the number of zones configured for this pool',
        value => {
          const hasSystemComponents = get(this.worker, 'systemComponents.allow', true)
          if (!hasSystemComponents) {
            return true
          }
          const zones = get(this.worker, 'zones.length', 0)
          return value >= zones
        }),
    }
    rules.worker.maximum = withFieldName(() => `${this.workerGroupName} Autoscaler Max.`, maximumRules)

    rules.worker.maxSurge = withFieldName(() => `${this.workerGroupName} Max. Surge`, {
      numberOrPercentage,
    })

    rules.selectedZones = withFieldName(() => `${this.workerGroupName} Zones`, {
      required: requiredIf(() => this.zonedCluster),
    })

    const volumeSizeRules = {
      minVolumeSize: withMessage(`Minimum size is ${this.minimumVolumeSize}`, value => {
        if (!this.hasVolumeSize) {
          return true
        }
        if (!value) {
          return false
        }
        return this.minimumVolumeSize <= parseSize(value)
      }),
    }
    rules.volumeSize = withFieldName(() => `${this.workerGroupName} Volume Size`, volumeSizeRules)

    rules.machineArchitecture = withFieldName(() => `${this.workerGroupName} Machine Architecture`, {
      required,
    })

    return rules
  },
  computed: {
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
    selectedVolumeType () {
      return find(this.volumeTypes, ['name', this.worker.volume?.type])
    },
    machineImages () {
      const machineImages = this.machineImagesByCloudProfileName(this.cloudProfileName)
      const architecture = this.worker.machine.architecture
      return filter(machineImages, ({ isExpired, architectures }) => !isExpired && includes(architectures, architecture))
    },
    minimumVolumeSize () {
      const minimumVolumeSize = parseSize(this.minimumVolumeSizeByMachineTypeAndVolumeType({ machineType: this.selectedMachineType, volumeType: this.selectedVolumeType }))
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
            props: {
              disabled: includes(this.immutableZones, zone),
            },
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
          props: {
            disabled: !includes(this.availableZones, zone),
          },
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
        this.onInputVolumeSize()
      },
    },

    workerGroupName () {
      return this.worker.name ? `[Worker Group ${this.worker.name}]` : '[Worker Group]'
    },
    hasVolumeSize () {
      return this.volumeInCloudProfile || this.hasCustomStorageSize
    },
  },
  mounted () {
    const volumeSize = get(this.worker, 'volume.size')
    if (volumeSize) {
      this.volumeSize = volumeSize
      if (!this.volumeInCloudProfile) {
        this.hasCustomStorageSize = true
      }
    }
    this.onInputVolumeSize()
    this.immutableZones = this.isNew ? [] : this.initialZones
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'machineTypesByCloudProfileNameAndRegionAndArchitecture',
      'machineArchitecturesByCloudProfileNameAndRegion',
      'volumeTypesByCloudProfileNameAndRegion',
      'machineImagesByCloudProfileName',
      'minimumVolumeSizeByMachineTypeAndVolumeType',
    ]),
    onInputName () {
      this.v$.worker.name.$touch()
    },
    onInputVolumeSize () {
      if (this.hasVolumeSize) {
        set(this.worker, 'volume.size', this.volumeSize)
      } else {
        // default size, must not write to shoot spec
        delete this.worker.volume
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
    resetWorkerMachine () {
      this.worker.machine.type = get(head(this.machineTypes), 'name')
      const machineImage = head(this.machineImages)
      this.worker.machine.image = pick(machineImage, ['name', 'version'])
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>
  :deep(.v-chip--disabled) {
    opacity: 1;
  }
</style>
