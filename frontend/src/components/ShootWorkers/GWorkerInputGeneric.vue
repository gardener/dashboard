<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="pa-0"
  >
    <div class="worker-cards">
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-label-outline"
              size="x-small"
            />
            <span class="text-body-medium">Worker Group</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              cols="12"
              class="py-0"
            >
              <v-text-field
                v-model="worker.name"
                color="primary"
                :error-messages="getErrorMessages(v$.name)"
                counter="15"
                label="Group Name"
                variant="underlined"
                @input="v$.name.$touch()"
                @blur="v$.name.$touch()"
              />
            </v-col>
            <v-col
              v-if="isZonedCluster"
              cols="12"
              class="py-0"
            >
              <v-select
                v-model="selectedZones"
                color="primary"
                item-color="primary"
                label="Zones"
                :items="zoneItems"
                :error-messages="getErrorMessages(v$.zones)"
                multiple
                chips
                closable-chips
                :hint="zoneHint"
                persistent-hint
                item-title="text"
                variant="underlined"
                @update:model-value="onInputZones"
                @blur="v$.zones.$touch()"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-server"
              size="x-small"
            />
            <span class="text-body-medium">Machine</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              cols="6"
              class="py-0"
            >
              <v-select
                v-model="machineArchitecture"
                color="primary"
                item-color="primary"
                :items="machineArchitectures"
                :error-messages="getErrorMessages(v$.machine.architecture)"
                label="Architecture"
                variant="underlined"
                @blur="v$.machine.architecture.$touch()"
              />
            </v-col>
            <v-col
              cols="12"
              class="py-0"
            >
              <g-machine-type
                v-model="machineTypeValue"
                :machine-types="machineTypes"
                :validation="v$.machine.type"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-disc"
              size="x-small"
            />
            <span class="text-body-medium">Image</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              cols="12"
              class="py-0"
            >
              <g-machine-image
                :machine-images="filteredMachineImages"
                :worker="worker"
                :machine-type="selectedMachineType"
                :auto-update="maintenanceAutoUpdateMachineImageVersion"
                :validation="v$.machine.image"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-oci"
              size="x-small"
            />
            <span class="text-body-medium">Container Runtime</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              cols="12"
              class="py-0"
            >
              <g-container-runtime
                :machine-image-cri="machineImageCri"
                :worker="worker"
                :kubernetes-version="kubernetesVersion"
                :validation="v$.cri.name"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-chart-line-variant"
              size="x-small"
            />
            <span class="text-body-medium">Autoscaler</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              cols="6"
              class="py-0"
            >
              <v-text-field
                v-model="innerMin"
                min="0"
                color="primary"
                :error-messages="getErrorMessages(v$.minimum)"
                type="number"
                label="Autoscaler Min."
                hint="Minimum nodes kept running at all times"
                variant="underlined"
                @input="v$.minimum.$touch()"
                @blur="ensureValidAutoscalerMin()"
              />
            </v-col>
            <v-col
              cols="6"
              class="py-0"
            >
              <v-text-field
                v-model="innerMax"
                min="0"
                color="primary"
                type="number"
                label="Autoscaler Max."
                hint="Maximum nodes the autoscaler can scale up to"
                variant="underlined"
                :error-messages="getErrorMessages(v$.maximum)"
                @input="v$.maximum.$touch()"
                @blur="ensureValidAutoscalerMax()"
              />
            </v-col>
            <v-col
              cols="6"
              class="py-0"
            >
              <v-text-field
                v-model="maxSurge"
                min="0"
                color="primary"
                :error-messages="getErrorMessages(v$.maxSurge)"
                label="Max. Surge"
                hint="Number of extra nodes allowed during a rolling update"
                variant="underlined"
                @input="v$.maxSurge.$touch()"
                @blur="v$.maxSurge.$touch()"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-card class="worker-section-card">
        <v-toolbar
          height="28"
          class="text-medium-emphasis toolbar-tonal-primary"
        >
          <div class="d-flex align-center ga-2 px-3">
            <v-icon
              icon="mdi-harddisk"
              size="x-small"
            />
            <span class="text-body-medium">Volume</span>
          </div>
        </v-toolbar>
        <v-card-text class="pa-3">
          <v-row density="compact">
            <v-col
              v-if="volumeInCloudProfile"
              cols="12"
              class="py-0"
            >
              <g-volume-type
                :volume-types="volumeTypes"
                :worker="worker"
                :cloud-profile-ref="cloudProfileRef"
                :volume-type-validation="v$.volume.type"
                :iops-validation="v$.providerConfig.volume.iops"
              />
            </v-col>
            <v-col
              cols="12"
              class="py-0"
            >
              <g-volume-size-input
                v-model="volumeSize"
                v-model:has-custom-storage-size="hasCustomStorageSize"
                :min="minVolumeSizeGi"
                :default-storage-size="defaultStorageSize"
                :has-volume-types="volumeInCloudProfile"
                color="primary"
                :error-messages="getErrorMessages(v$.volume.size)"
                @update:custom-storage="onInputVolumeSize"
                @update:model-value="onInputVolumeSize"
                @blur="v$.volume.size.$touch()"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
    <div class="mt-2">
      <slot name="action" />
    </div>
  </v-container>
</template>

<script>
import { computed } from 'vue'

import GVolumeSizeInput from '@/components/ShootWorkers/GVolumeSizeInput'
import GMachineType from '@/components/ShootWorkers/GMachineType'
import GVolumeType from '@/components/ShootWorkers/GVolumeType'
import GMachineImage from '@/components/ShootWorkers/GMachineImage'
import GContainerRuntime from '@/components/ShootWorkers/GContainerRuntime'

import { useShootContext } from '@/composables/useShootContext'
import { useMachineImages } from '@/composables/useCloudProfile/useMachineImages.js'
import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes.js'
import { useRegions } from '@/composables/useCloudProfile/useRegions.js'
import {
  getWorkerMinimumVolumeSizeGi,
  useVolumeTypes,
} from '@/composables/useCloudProfile/useVolumeTypes.js'

import { getErrorMessages } from '@/utils'

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
    validation: {
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
      maxAdditionalZones,
      isZonedCluster,
      maintenanceAutoUpdateMachineImageVersion,
      machineArchitectures,
      allMachineTypes,
      volumeTypes,
    } = useShootContext()

    const { visibleMachineImages: machineImages, useDefaultMachineImage } = useMachineImages(cloudProfile)
    const { useZones } = useRegions(cloudProfile)
    const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)
    const { volumeTypes: allVolumeTypes } = useVolumeTypes(cloudProfile)

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
    const minVolumeSizeGi = computed(() => getWorkerMinimumVolumeSizeGi(
      props.worker,
      allMachineTypes.value,
      allVolumeTypes.value,
    ))

    return {
      v$: computed(() => props.validation),
      isNewCluster,
      cloudProfileRef,
      kubernetesVersion,
      region,
      allZones,
      availableZones,
      initialZones,
      maxAdditionalZones,
      isZonedCluster,
      maintenanceAutoUpdateMachineImageVersion,
      machineArchitectures,
      volumeTypes,
      machineImages,
      machineArchitecture,
      machineTypes,
      selectedMachineType,
      minVolumeSizeGi,
      useFilteredMachineTypes,
    }
  },
  data () {
    return {
      volumeSize: undefined,
      hasCustomStorageSize: false,
    }
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
    filteredMachineImages () {
      return filter(this.machineImages, ({ isExpired, architectures }) => !isExpired && includes(architectures, this.machineArchitecture))
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
        this.v$.volume.size?.$touch()
      },
      immediate: true,
    },
  },
  methods: {
    onInputVolumeSize () {
      if (this.hasVolumeSize) {
        set(this.worker, ['volume', 'size'], this.volumeSize)
      } else {
        // default size, must not write to shoot spec
        delete this.worker.volume
      }
      this.v$.volume.size?.$touch()
    },
    onInputZones () {
      this.v$.zones.$touch()
      this.v$.maximum.$touch()
    },
    ensureValidAutoscalerMin () {
      this.v$.minimum.$touch()
      // Ensure maximum is not less than minimum
      if (this.innerMax < this.worker.minimum) {
        this.worker.maximum = this.worker.minimum
      }
    },
    ensureValidAutoscalerMax () {
      this.v$.maximum.$touch()
      // Ensure minimum is not greater than maximum
      if (this.innerMin > this.worker.maximum) {
        this.worker.minimum = this.worker.maximum
      }
    },
    getErrorMessages,
  },
}
</script>

<style scoped>
.worker-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 300px));
  gap: 8px;
  align-items: start;
}

:deep(.v-chip--disabled) {
  opacity: 1;
}

.worker-section-card {
  min-height: 200px;
  .toolbar-tonal-primary {
    background-color: rgba(var(--v-theme-primary), var(--v-activated-opacity, 0.2));
  }
}
</style>
