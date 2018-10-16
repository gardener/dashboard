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
  <v-layout row>
    <v-flex xs1 class="mt-1"><v-avatar class="cyan darken-2"><v-icon class="white--text">mdi-server</v-icon></v-avatar></v-flex>
    <v-flex xs2 class="ml-2">
      <v-text-field
        color="cyan darken-2"
        :error-messages="getErrorMessages('worker.name')"
        @input="$v.worker.name.$touch()"
        @blur="$v.worker.name.$touch()"
        v-model="worker.name"
        counter="15"
        label="Group Name">
      </v-text-field>
    </v-flex>

    <v-flex xs2  class="ml-3">
      <machine-type
      :machineTypes="machineTypes"
      :worker="worker">
      </machine-type>
    </v-flex>

    <v-flex xs2  class="ml-5">
      <volume-type
      :volumeTypes="volumeTypes"
      :worker="worker">
      </volume-type>
    </v-flex>

    <v-flex xs1  class="ml-3">
      <size-input
        min="1"
        color="cyan darken-2"
        :error-messages="getErrorMessages('worker.volumeSize')"
        @input="$v.worker.volumeSize.$touch()"
        @blur="$v.worker.volumeSize.$touch()"
        label="Volume Size"
        v-model="worker.volumeSize"
      ></size-input>
    </v-flex>

    <v-flex xs1 class="ml-3">
      <v-text-field
        min="0"
        color="cyan darken-2"
        :error-messages="getErrorMessages('worker.autoScalerMin')"
        @input="$v.worker.autoScalerMin.$touch()"
        @blur="$v.worker.autoScalerMin.$touch()"
        type="number"
        v-model="innerMin"
        label="Autoscaler Min."></v-text-field>
    </v-flex>

    <v-flex xs1 class="ml-3">
      <v-text-field
        min="0"
        color="cyan darken-2"
        :error-messages="getErrorMessages('worker.autoScalerMax')"
        @input="$v.worker.autoScalerMax.$touch()"
        @blur="$v.worker.autoScalerMax.$touch()"
        type="number"
        v-model="innerMax"
        label="Max."
      ></v-text-field>
    </v-flex>

    <v-flex xs1 class="ml-2 mt-2">
      <slot name="action">
      </slot>
    </v-flex>

  </v-layout>
</template>

<script>
import { mapGetters } from 'vuex'
import SizeInput from '@/components/VolumeSizeInput'
import MachineType from '@/components/MachineType'
import VolumeType from '@/components/VolumeType'
import { required, maxLength, minValue } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import { uniqueWorkerName, minVolumeSize, resourceName, noStartEndHyphen } from '@/utils/validators'

const validationErrors = {
  worker: {
    name: {
      required: 'Name is required',
      maxLength: 'Name ist too long',
      resourceName: 'Name must only be lowercase letters, numbers and hyphens',
      uniqueWorkerName: 'Name is taken. Try another.',
      noStartEndHyphen: 'Name must not start or end with a hyphen'
    },
    volumeSize: {
      minVolumeSize: 'Invalid volume size'
    },
    autoScalerMin: {
      minValue: 'Invalid value'
    },
    autoScalerMax: {
      minValue: 'Invalid value'
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
    volumeSize: {
      minVolumeSize: minVolumeSize(1)
    },
    autoScalerMin: {
      minValue: minValue(0)
    },
    autoScalerMax: {
      minValue: minValue(0)
    },
    machineType: {
      required
    }
  }
}

export default {
  components: {
    SizeInput,
    MachineType,
    VolumeType
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
    }
  },
  data () {
    return {
      validationErrors
    }
  },
  validations,
  computed: {
    ...mapGetters([
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName'
    ]),

    machineTypes () {
      return this.machineTypesByCloudProfileName(this.cloudProfileName)
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileName(this.cloudProfileName)
    },

    innerMin: {
      get: function () {
        return Math.max(0, this.worker.autoScalerMin)
      },
      set: function (value) {
        this.worker.autoScalerMin = Math.max(0, parseInt(value))
        if (this.innerMax < this.worker.autoScalerMin) {
          this.worker.autoScalerMax = this.worker.autoScalerMin
        }
      }
    },
    innerMax: {
      get: function () {
        return Math.max(0, this.worker.autoScalerMax)
      },
      set: function (value) {
        this.worker.autoScalerMax = Math.max(0, parseInt(value))
        if (this.innerMin > this.worker.autoScalerMax) {
          this.worker.autoScalerMin = this.worker.autoScalerMax
        }
      }
    }
  },

  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  }
}
</script>
