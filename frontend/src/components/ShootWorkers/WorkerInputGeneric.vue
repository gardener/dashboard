
<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regularInput">
        <v-text-field
          color="primary"
          :error-messages="getErrorMessages('worker.name')"
          @input="onInputName"
          @blur="$v.worker.name.$touch()"
          v-model="worker.name"
          counter="15"
          label="Group Name">
        </v-text-field>
      </div>
      <div class="regularInput">
        <machine-type
        :machineTypes="machineTypes"
        :worker="worker"
        @updateMachineType="onUpdateMachineType"
        @valid="onMachineTypeValid">
        </machine-type>
      </div>
      <div class="regularInput">
        <machine-image
        :machineImages="machineImages"
        :worker="worker"
        :updateOSMaintenance="updateOSMaintenance"
        @updateMachineImage="onUpdateMachineImage"
        @valid="onMachineImageValid">
        </machine-image>
      </div>
      <div v-if="volumeInCloudProfile" class="regularInput">
        <volume-type
        :volumeTypes="volumeTypes"
        :worker="worker"
        :cloudProfileName="cloudProfileName"
        @updateVolumeType="onUpdateVolumeType"
        @valid="onVolumeTypeValid">
        </volume-type>
      </div>
      <div v-if="canDefineVolumeSize" class="smallInput">
        <size-input
          :min="minimumVolumeSize"
          color="primary"
          :error-messages="getErrorMessages('volumeSizeInternal')"
          @input="onInputVolumeSize"
          @blur="$v.volumeSizeInternal.$touch()"
          label="Volume Size"
          v-model="volumeSizeInternal"
        ></size-input>
      </div>
      <div class="smallInput">
        <v-text-field
          min="0"
          color="primary"
          :error-messages="getErrorMessages('worker.minimum')"
          @input="onInputminimum"
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
          @input="onInputmaximum"
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
          @input="onInputMaxSurge"
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
          @input="onInputZones"
          @blur="$v.selectedZones.$touch()"
          multiple
          chips
          deletable-chips
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
import SizeInput from '@/components/ShootWorkers/VolumeSizeInput'
import MachineType from '@/components/ShootWorkers/MachineType'
import VolumeType from '@/components/ShootWorkers/VolumeType'
import MachineImage from '@/components/ShootWorkers/MachineImage'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import map from 'lodash/map'
import includes from 'lodash/includes'
import sortBy from 'lodash/sortBy'
import concat from 'lodash/concat'
import last from 'lodash/last'
import difference from 'lodash/difference'
import find from 'lodash/find'
import get from 'lodash/get'
import set from 'lodash/set'
import { required, maxLength, minValue, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors, parseSize, machineTypeHasStorageWithTypeFixed } from '@/utils'
import { uniqueWorkerName, resourceName, noStartEndHyphen, numberOrPercentage } from '@/utils/validators'

const validationErrors = {
  worker: {
    name: {
      required: 'Name is required',
      maxLength: 'Name ist too long',
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
  volumeSizeInternal: {
    minVolumeSize: 'Invalid volume size'
  }
}

export default {
  components: {
    SizeInput,
    MachineType,
    VolumeType,
    MachineImage
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
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      machineTypeValid: undefined,
      volumeTypeValid: true, // selection not shown in all cases, default to true
      machineImageValid: undefined,
      immutableZones: undefined,
      volumeSizeInternal: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileNameAndRegionAndZones',
      'volumeTypesByCloudProfileNameAndRegionAndZones',
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
        volumeSizeInternal: {
          minVolumeSize (value) {
            if (!this.canDefineVolumeSize) {
              return true
            }
            if (!value) {
              return false
            }
            return minValue(this.minimumVolumeSize)(parseSize(value))
          }
        }
      }
    },
    machineTypes () {
      return this.machineTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName: this.cloudProfileName, region: this.region, zones: this.worker.zones })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileNameAndRegionAndZones({ cloudProfileName: this.cloudProfileName, region: this.region, zones: this.worker.zones })
    },
    volumeInCloudProfile () {
      return !isEmpty(this.volumeTypes)
    },
    selectedMachineType () {
      return find(this.machineTypes, { name: this.worker.machine.type })
    },
    canDefineVolumeSize () {
      if (this.volumeInCloudProfile) {
        return true
      }
      const machineType = this.selectedMachineType
      if (machineType && !machineType.storage) {
        return true
      }
      if (machineType && machineType.storage && !machineTypeHasStorageWithTypeFixed(machineType)) {
        return true
      }
      return false
    },
    machineImages () {
      return filter(this.machineImagesByCloudProfileName(this.cloudProfileName), ({ isExpired }) => {
        return !isExpired
      })
    },
    minimumVolumeSize () {
      const minimumVolumeSize = parseSize(this.minimumVolumeSizeByCloudProfileNameAndRegion({ cloudProfileName: this.cloudProfileName, region: this.region }))

      const machineType = this.selectedMachineType
      const machineTypeStorageSize = get(machineType, 'storage.size')
      if (machineTypeStorageSize) {
        const machineTypeDefaultSize = parseSize(machineTypeStorageSize)
        if (machineTypeDefaultSize && machineTypeDefaultSize < minimumVolumeSize) {
          return machineTypeDefaultSize
        }
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
        this.worker.zones = map(zoneValues, last)
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
    onUpdateMachineType () {
      this.setVolumeDependingOnMachineType()
      this.validateInput()
    },
    onUpdateVolumeType () {
      this.validateInput()
    },
    onInputVolumeSize () {
      const machineType = this.selectedMachineType
      if (!this.canDefineVolumeSize || get(machineType, 'storage.size') === this.volumeSizeInternal) {
        delete this.worker.volume
      } else {
        set(this.worker, 'volume.size', this.volumeSizeInternal)
      }
      this.$v.volumeSizeInternal.$touch()
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
      this.$emit('updateMaxSurge', { maxSurge: this.worker.maxSurge, id: this.worker.id })
      this.validateInput()
    },
    onInputZones () {
      this.$v.selectedZones.$touch()
      this.validateInput()
    },
    onMachineTypeValid ({ valid }) {
      if (this.machineTypeValid !== valid) {
        this.machineTypeValid = valid
        this.validateInput()
      }
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
    validateInput () {
      const valid = !this.$v.$invalid && this.machineTypeValid && this.volumeTypeValid && this.machineImageValid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    },
    setVolumeDependingOnMachineType () {
      if (!get(this.worker, 'volume.size')) {
        const machineType = this.selectedMachineType
        if (machineType && machineType.storage && !machineTypeHasStorageWithTypeFixed(machineType)) {
          this.volumeSizeInternal = machineType.storage.size
        }
      }
      this.onInputVolumeSize()
    }
  },
  mounted () {
    this.validateInput()
    const workerVolumeSize = get(this.worker, 'volume.size')
    if (workerVolumeSize) {
      this.volumeSizeInternal = workerVolumeSize
    }
    this.setVolumeDependingOnMachineType()
    this.immutableZones = this.isNew ? [] : this.worker.zones
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

  ::v-deep .v-list-item--disabled {
    opacity:0.5;
  }

  ::v-deep .v-chip--disabled {
    opacity: 1;
  }
</style>
