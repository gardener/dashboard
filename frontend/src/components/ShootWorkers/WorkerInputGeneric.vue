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

<template>
  <v-container grid-list-xl class="py-0 ma-0">
    <v-layout row align-center>
      <v-layout row wrap>
        <v-flex class="regularInput">
          <v-text-field
            color="cyan darken-2"
            :error-messages="getErrorMessages('worker.name')"
            @input="onInputName"
            @blur="$v.worker.name.$touch()"
            v-model="worker.name"
            counter="15"
            label="Group Name">
          </v-text-field>
        </v-flex>
        <v-flex>
          <machine-type
          :machineTypes="machineTypes"
          :worker="worker"
          @updateMachineType="onUpdateMachineType"
          @valid="onMachineTypeValid">
          </machine-type>
        </v-flex>
        <v-flex class="regularInput">
          <machine-image
          :machineImages="machineImages"
          :worker="worker"
          @updateMachineImage="onUpdateMachineImage"
          @valid="onMachineImageValid">
          </machine-image>
        </v-flex>
        <v-flex v-if="volumeInCloudProfile" class="regularInput">
          <volume-type
          :volumeTypes="volumeTypes"
          :worker="worker"
          @updateVolumeType="onUpdateVolumeType"
          @valid="onVolumeTypeValid">
          </volume-type>
        </v-flex>
        <v-flex v-if="volumeInCloudProfile" class="smallInput">
          <size-input
            min="1"
            color="cyan darken-2"
            :error-messages="getErrorMessages('worker.volume.size')"
            @input="onInputVolumeSize"
            @blur="$v.worker.volume.size.$touch()"
            label="Volume Size"
            v-model="worker.volume.size"
          ></size-input>
        </v-flex>
        <v-flex class="smallInput">
          <v-text-field
            min="0"
            color="cyan darken-2"
            :error-messages="getErrorMessages('worker.minimum')"
            @input="onInputminimum"
            @blur="$v.worker.minimum.$touch()"
            type="number"
            v-model="innerMin"
            label="Autoscaler Min."></v-text-field>
        </v-flex>
        <v-flex class="smallInput">
          <v-text-field
            min="0"
            color="cyan darken-2"
            :error-messages="getErrorMessages('worker.maximum')"
            @input="onInputmaximum"
            @blur="$v.worker.maximum.$touch()"
            type="number"
            v-model="innerMax"
            label="Autoscaler Max."
          ></v-text-field>
        </v-flex>
        <v-flex class="smallInput">
          <v-text-field
            min="0"
            color="cyan darken-2"
            :error-messages="getErrorMessages('worker.maxSurge')"
            @input="onInputMaxSurge"
            @blur="$v.worker.maxSurge.$touch()"
            v-model="maxSurge"
            label="Max. Surge"></v-text-field>
        </v-flex>
      </v-layout>
      <v-flex class="ml-3">
        <slot name="action"></slot>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import isEmpty from 'lodash/isEmpty'
import SizeInput from '@/components/ShootWorkers/VolumeSizeInput'
import MachineType from '@/components/ShootWorkers/MachineType'
import VolumeType from '@/components/ShootWorkers/VolumeType'
import MachineImage from '@/components/ShootWorkers/MachineImage'
import { required, maxLength, minValue } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import { uniqueWorkerName, minVolumeSize, resourceName, noStartEndHyphen, numberOrPercentage } from '@/utils/validators'

const validationErrors = {
  worker: {
    name: {
      required: 'Name is required',
      maxLength: 'Name ist too long',
      resourceName: 'Name must only be lowercase letters, numbers and hyphens',
      uniqueWorkerName: 'Name is taken. Try another.',
      noStartEndHyphen: 'Name must not start or end with a hyphen'
    },
    volume: {
      size: {
        minVolumeSize: 'Invalid volume size'
      }
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
  }
}

const validations = {
  worker: {
    name: {
      required,
      maxLength: maxLength(15),
      noStartEndHyphen, // Order is important for UI hints
      resourceName,
      uniqueWorkerName
    },
    volume: {
      size: {
        minVolumeSize: minVolumeSize(1)
      }
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
    zones: {
      type: Array
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      machineTypeValid: undefined,
      volumeTypeValid: true, // selection not shown in all cases, default to true
      machineImageValid: undefined
    }
  },
  validations,
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileNameAndZones',
      'volumeTypesByCloudProfileNameAndZones',
      'machineImagesByCloudProfileName'
    ]),
    machineTypes () {
      return this.machineTypesByCloudProfileNameAndZones({ cloudProfileName: this.cloudProfileName, zones: this.zones })
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileNameAndZones({ cloudProfileName: this.cloudProfileName, zones: this.zones })
    },
    volumeInCloudProfile () {
      return !isEmpty(this.volumeTypes)
    },
    machineImages () {
      return this.machineImagesByCloudProfileName(this.cloudProfileName)
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
      this.validateInput()
    },
    onUpdateVolumeType () {
      this.validateInput()
    },
    onInputVolumeSize () {
      this.$v.worker.volume.size.$touch()
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
    }
  },
  mounted () {
    this.validateInput()
  }
}
</script>

<style lang="styl" scoped>
  .regularInput {
    max-width: 300px;
  }
  .smallInput {
    max-width: 120px;
  }
</style>
