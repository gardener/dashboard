<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center ga-4">
    <div class="d-flex flex-wrap">
      <div class="regular-input name-input">
        <v-text-field
          v-model="worker.name"
          v-messages-color="{ color: 'warning' }"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.name)"
          counter="15"
          label="Group Name"
          variant="underlined"
          :hint="worker.controlPlane != null ? 'Control Plane Worker Pool' : undefined"
          :persistent-hint="worker.controlPlane != null"
          @input="v$.worker.name.$touch()"
          @blur="v$.worker.name.$touch()"
        />
      </div>
      <div class="regular-input">
        <v-select
          v-model="updateStrategy"
          color="primary"
          item-color="primary"
          :items="workerUpdateStrategies"
          label="Update Strategy"
          variant="underlined"
          :hint="updateStrategyHint"
          persistent-hint
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
          :machine-images="filteredMachineImages"
          :worker="worker"
          :machine-type="selectedMachineType"
          :auto-update="maintenanceAutoUpdateMachineImageVersion"
          :field-name="`${workerGroupName} Machine Image`"
        />
      </div>
      <g-container-runtime
        :machine-image-cri="machineImageCri"
        :worker="worker"
        :kubernetes-version="kubernetesVersion"
        :field-name="`${workerGroupName} Container Runtime`"
      />
      <div
        v-if="volumeInCloudProfile"
        class="regular-input"
      >
        <g-volume-type
          :volume-types="volumeTypes"
          :worker="worker"
          :cloud-profile-ref="cloudProfileRef"
          :field-name="`${workerGroupName} Volume Type`"
        />
      </div>
      <div :class="volumeInCloudProfile ? 'small-input' : 'regular-input'">
        <g-volume-size-input
          v-model="volumeSize"
          v-model:has-custom-storage-size="hasCustomStorageSize"
          :min="minVolumeSizeGi"
          :default-storage-size="defaultStorageSize"
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
          @input="v$.worker.minimum.$touch()"
          @blur="ensureValidAutoscalerMin()"
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
          @input="v$.worker.maximum.$touch()"
          @blur="ensureValidAutoscalerMax()"
        />
      </div>
      <div
        v-if="!isManualInPlaceUpdate"
        class="small-input"
      >
        <v-text-field
          v-model="maxSurge"
          min="0"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.maxSurge)"
          label="Max. Surge"
          variant="underlined"
          @input="v$.worker.maxSurge.$touch()"
          @blur="v$.worker.maxSurge.$touch()"
        />
      </div>
      <div
        v-if="isAutoInPlaceUpdate"
        class="small-input"
      >
        <v-text-field
          v-model="maxUnavailable"
          min="0"
          color="primary"
          :error-messages="getErrorMessages(v$.worker.maxUnavailable)"
          label="Max. Unavailable"
          variant="underlined"
          @input="v$.worker.maxUnavailable.$touch()"
          @blur="v$.worker.maxUnavailable.$touch()"
        />
      </div>

      <div
        v-if="isZonedCluster"
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
    <div>
      <slot name="action" />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import semver from 'semver'
import {
  required,
  maxLength,
  minValue,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GVolumeSizeInput from '@/components/ShootWorkers/GVolumeSizeInput'
import GMachineType from '@/components/ShootWorkers/GMachineType'
import GVolumeType from '@/components/ShootWorkers/GVolumeType'
import GMachineImage from '@/components/ShootWorkers/GMachineImage'
import GContainerRuntime from '@/components/ShootWorkers/GContainerRuntime'

import { useShootContext } from '@/composables/useShootContext'
import { firstItemMatchingVersionClassification } from '@/composables/helper.js'
import { useMachineImages } from '@/composables/useCloudProfile/useMachineImages.js'
import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes.js'
import { useRegions } from '@/composables/useCloudProfile/useRegions.js'
import { useVolumeTypes } from '@/composables/useCloudProfile/useVolumeTypes.js'

import {
  withFieldName,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
  numberOrPercentage,
  withMessage,
  withParams,
} from '@/utils/validators'
import {
  getErrorMessages,
  convertToGi,
} from '@/utils'

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
import every from 'lodash/every'

const workerUpdateStrategies = [
  'AutoRollingUpdate',
  'AutoInPlaceUpdate',
  'ManualInPlaceUpdate',
]

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
  },
  setup (props) {
    const {
      isNewCluster,
      cloudProfileRef,
      cloudProfile,
      kubernetesVersion,
      region,
      allZones,
      availableZones,
      initialZones,
      initialProviderWorkers,
      maxAdditionalZones,
      isZonedCluster,
      maintenanceAutoUpdateMachineImageVersion,
      machineArchitectures,
      providerWorkers,
      volumeTypes,
    } = useShootContext()

    const configStore = useConfigStore()

    const { visibleMachineImages: machineImages, useDefaultMachineImage } = useMachineImages(cloudProfile)
    const { useZones } = useRegions(cloudProfile)
    const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)
    const { useMinimumVolumeSize, volumeTypes: allVolumeTypes } = useVolumeTypes(cloudProfile)

    function resetWorkerMachine () {
      props.worker.machine.type = get(defaultMachineType.value, ['name'])
      props.worker.machine.image = pick(defaultMachineImage.value, ['name', 'version'])
    }

    const machineArchitecture = computed({
      get () {
        return props.worker.machine.architecture
      },
      set (architecture) {
        props.worker.machine.architecture = architecture

        // Reset machine type and image to default as they won't be supported by new architecture
        resetWorkerMachine()
      },
    })

    const machineTypes = useFilteredMachineTypes(
      region,
      machineArchitecture,
    )

    const defaultMachineType = computed(() => head(machineTypes.value))

    const defaultMachineTypeArchitecture = computed(() => get(defaultMachineType.value, ['architecture']))

    const defaultMachineImage = useDefaultMachineImage(defaultMachineTypeArchitecture)

    const selectedMachineType = computed(() => find(machineTypes.value, ['name', props.worker.machine.type]))
    const selectedVolumeType = computed(() => find(allVolumeTypes.value, ['name', props.worker.volume?.type]))

    const minimumVolumeSize = useMinimumVolumeSize(
      selectedMachineType,
      selectedVolumeType,
    )

    return {
      v$: useVuelidate(),
      isNewCluster,
      cloudProfileRef,
      kubernetesVersion,
      region,
      allZones,
      availableZones,
      initialZones,
      initialProviderWorkers,
      maxAdditionalZones,
      isZonedCluster,
      maintenanceAutoUpdateMachineImageVersion,
      machineArchitectures,
      volumeTypes,
      providerWorkers,
      machineImages,
      machineArchitecture,
      machineTypes,
      selectedMachineType,
      selectedVolumeType,
      minimumVolumeSize,
      useFilteredMachineTypes,
      configStore,
      workerUpdateStrategies,
    }
  },
  data () {
    return {
      volumeSize: undefined,
      hasCustomStorageSize: false,
    }
  },
  validations () {
    const rules = { worker: {} }

    const uniqueWorkerName = withMessage('Worker name must be unique', withParams(
      { type: 'uniqueWorkerName' },
      function unique (value) {
        return this.providerWorkers.filter(item => item.name === value).length === 1
      },
    ))

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
          const hasSystemComponents = get(this.worker, ['systemComponents', 'allow'], true)
          if (!hasSystemComponents) {
            return true
          }
          const zones = get(this.worker, ['zones', 'length'], 0)
          return value >= zones
        }),
    }
    rules.worker.maximum = withFieldName(() => `${this.workerGroupName} Autoscaler Max.`, maximumRules)

    rules.worker.maxSurge = withFieldName(() => `${this.workerGroupName} Max. Surge`, {
      numberOrPercentage,
    })

    rules.worker.maxUnavailable = withFieldName(() => `${this.workerGroupName} Max. Unavailable`, {
      numberOrPercentage,
    })

    rules.selectedZones = withFieldName(() => `${this.workerGroupName} Zones`, {
      required: requiredIf(() => this.isZonedCluster),
    })

    const volumeSizeRules = {
      minVolumeSize: withMessage(() => `Minimum size is ${this.minVolumeSizeGi}`, value => {
        if (!this.hasVolumeSize) {
          return true
        }
        if (!value) {
          return false
        }
        return this.minVolumeSizeGi <= convertToGi(value)
      }),
    }
    rules.volumeSize = withFieldName(() => `${this.workerGroupName} Volume Size`, volumeSizeRules)

    rules.machineArchitecture = withFieldName(() => `${this.workerGroupName} Machine Architecture`, {
      required,
    })

    return rules
  },
  computed: {
    immutableZones () {
      return this.isNewCluster || this.worker.isNew
        ? []
        : this.initialZones
    },
    volumeInCloudProfile () {
      return !isEmpty(this.volumeTypes)
    },
    availableMachineImages () {
      // All machine image versions usable by this worker: not expired and matching the architecture.
      return filter(this.machineImages, ({ isExpired, architectures }) => !isExpired && includes(architectures, this.machineArchitecture))
    },
    inPlaceEligibleMachineImages () {
      // Subset of availableMachineImages that can be used with an in-place update strategy.
      const committedImage = this.committedImage
      const committedVersion = this.committedImageVersion
      return filter(this.availableMachineImages, image => {
        const { inPlaceUpdates, name, version } = image

        if (this.isNewCluster || this.worker.isNew) {
          // New worker pool: any image version that supports in-place updates is eligible.
          return Boolean(inPlaceUpdates?.supported)
        }

        // Existing worker pool: always keep the currently installed (committed) version so the user
        // can inspect the options without being forced to update, and can revert their selection to it.
        if (committedImage && name === committedImage.name && version === committedImage.version) {
          return true
        }
        // Otherwise only versions reachable from the committed version (minVersionForUpdate <= committed).
        if (!inPlaceUpdates?.supported) {
          return false
        }
        const { minVersionForUpdate } = inPlaceUpdates
        if (!semver.valid(minVersionForUpdate) || !semver.valid(committedVersion)) {
          return false
        }
        return semver.lte(minVersionForUpdate, committedVersion) && semver.gte(version, committedVersion)
      })
    },
    filteredMachineImages () {
      // Rolling updates may use any available image; in-place strategies are restricted to eligible ones.
      return this.isInPlaceUpdate ? this.inPlaceEligibleMachineImages : this.availableMachineImages
    },
    inPlaceUpdatePossible () {
      return !isEmpty(this.inPlaceEligibleMachineImages)
    },
    minVolumeSizeGi () {
      const minimumVolumeSizeInGi = convertToGi(this.minimumVolumeSize)
      let defaultSize = get(this.selectedMachineType, ['storage.size'])
      if (defaultSize) {
        defaultSize = convertToGi(defaultSize)
      }
      if (defaultSize > 0 && defaultSize < minimumVolumeSizeInGi) {
        return defaultSize
      }

      return minimumVolumeSizeInGi
    },
    innerMin: {
      get () {
        return Math.max(0, this.worker.minimum)
      },
      set (value) {
        this.worker.minimum = Math.max(0, parseInt(value))
      },
    },
    innerMax: {
      get: function () {
        return Math.max(0, this.worker.maximum)
      },
      set: function (value) {
        this.worker.maximum = Math.max(0, parseInt(value))
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
    maxUnavailable: {
      get: function () {
        return this.worker.maxUnavailable
      },
      set: function (maxUnavailable) {
        if (maxUnavailable === '' || maxUnavailable === null || maxUnavailable === undefined) {
          delete this.worker.maxUnavailable
        } else if (/^[\d]+$/.test(maxUnavailable)) {
          this.worker.maxUnavailable = parseInt(maxUnavailable)
        } else {
          this.worker.maxUnavailable = maxUnavailable
        }
      },
    },
    updateStrategy: {
      get () {
        return this.worker.updateStrategy ?? 'AutoRollingUpdate'
      },
      set (value) {
        if (value === 'AutoInPlaceUpdate') {
          this.worker.updateStrategy = value
          this.worker.maxSurge = this.configStore.defaultInPlaceMaxSurge
          this.worker.maxUnavailable = this.configStore.defaultInPlaceMaxUnavailable
        } else if (value === 'ManualInPlaceUpdate') {
          this.worker.updateStrategy = value
          // maxSurge and maxUnavailable must not be set for manual in-place updates.
          delete this.worker.maxSurge
          delete this.worker.maxUnavailable
        } else {
          delete this.worker.updateStrategy
          this.worker.maxSurge = this.configStore.defaultMaxSurge
          delete this.worker.maxUnavailable
        }
        // The eligible image list depends on the strategy; keep the selection consistent with it.
        this.ensureCompatibleMachineImage()
      },
    },
    isInPlaceUpdate () {
      return this.updateStrategy === 'AutoInPlaceUpdate' || this.updateStrategy === 'ManualInPlaceUpdate'
    },
    isAutoInPlaceUpdate () {
      return this.updateStrategy === 'AutoInPlaceUpdate'
    },
    isManualInPlaceUpdate () {
      return this.updateStrategy === 'ManualInPlaceUpdate'
    },
    committedImage () {
      // The machine image the worker was created/last saved with (undefined for a new worker).
      const initialWorker = find(this.initialProviderWorkers, ['name', this.worker.name])
      return get(initialWorker, ['machine', 'image'])
    },
    committedImageVersion () {
      return this.committedImage?.version
    },
    updateStrategyHint () {
      // The strategy is always selectable. When an in-place strategy is chosen but no eligible image
      // exists, the image list is empty - surface a hint explaining why.
      if (this.isInPlaceUpdate && !this.inPlaceUpdatePossible) {
        return 'No machine image version supports in-place updates for the selected architecture'
      }
      return undefined
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
        this.worker.zones = map(zoneValues, last)
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
      const allAvailable = every(this.allZones, zone => {
        return includes(this.availableZones, zone)
      })
      if (allAvailable) {
        return ''
      }
      if (this.maxAdditionalZones >= this.availableZones.length) {
        return ''
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
      return find(this.filteredMachineImages, this.worker.machine.image)
    },
    machineImageCri () {
      return get(this.selectedMachineImage, ['cri'])
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
    defaultStorageSize () {
      return get(this.selectedMachineType, ['storage', 'size'])
    },
  },
  watch: {
    'worker.volume.size': {
      handler (volumeSize) {
        this.volumeSize = volumeSize
        this.hasCustomStorageSize = Boolean(volumeSize) && !this.volumeInCloudProfile
        this.v$.volumeSize?.$touch()
      },
      immediate: true,
    },
    'worker.machine.architecture' () {
      // Changing the architecture resets the machine image to that architecture's default, which may
      // not be compatible with an in-place update strategy. Re-select a compatible image.
      this.ensureCompatibleMachineImage()
    },
  },
  methods: {
    ensureCompatibleMachineImage () {
      // Keep the selected machine image within the list eligible for the current update strategy. If
      // the current selection is not eligible, switch to the default eligible image version.
      if (find(this.filteredMachineImages, this.worker.machine.image)) {
        return
      }
      const fallback = firstItemMatchingVersionClassification(this.filteredMachineImages)
      if (fallback) {
        this.worker.machine.image = pick(fallback, ['name', 'version'])
      }
    },
    onInputVolumeSize () {
      if (this.hasVolumeSize) {
        set(this.worker, ['volume', 'size'], this.volumeSize)
      } else {
        // default size, must not write to shoot spec
        delete this.worker.volume
      }
      this.v$.volumeSize?.$touch()
    },
    onInputZones () {
      this.v$.selectedZones.$touch()
      this.v$.worker.maximum.$touch()
    },
    ensureValidAutoscalerMin () {
      this.v$.worker.minimum.$touch()
      // Ensure maximum is not less than minimum
      if (this.innerMax < this.worker.minimum) {
        this.worker.maximum = this.worker.minimum
      }
    },
    ensureValidAutoscalerMax () {
      this.v$.worker.maximum.$touch()
      // Ensure minimum is not greater than maximum
      if (this.innerMin > this.worker.maximum) {
        this.worker.minimum = this.worker.maximum
      }
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>
  :deep(.v-chip--disabled) {
    opacity: 1;
  }

  // Pin the name field to its min-width so the control plane hint wraps instead of widening the input.
  .name-input {
    max-width: 180px;
  }
</style>
