<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <hint-colorizer hintColor="orange">
      <v-select
        color="cyan darken-2"
        item-color="cyan darken-2"
        :items="volumeTypeItems"
        item-text="name"
        item-value="name"
        v-model="worker.volume.type"
        :error-messages="getErrorMessages('worker.volume.type')"
        @input="onInputVolumeType"
        @blur="$v.worker.volume.type.$touch()"
        label="Volume Type"
        :hint="hint"
        persistent-hint>
        <template v-slot:item="{ item }">
          <v-list-item-content>
            <v-list-item-title>{{item.name}}</v-list-item-title>
            <v-list-item-subtitle v-if="item.class">Class: {{item.class}}</v-list-item-subtitle>
          </v-list-item-content>
        </template>
      </v-select>
    </hint-colorizer>
    <v-text-field
      v-if="isAWS"
      class="ml-1"
      color="cyan darken-2"
      :error-messages="getErrorMessages('workerIops')"
      @input="onInputIops"
      @blur="$v.workerIops.$touch()"
      v-model.number="workerIops"
      type="number"
      min="100"
      label="IOPS">
    </v-text-field>
  </div>
</template>

<script>

import { mapGetters } from 'vuex'
import HintColorizer from '@/components/HintColorizer'
import { required, requiredIf, minValue } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import { getWorkerProviderConfig } from '@/utils/createShoot'
import find from 'lodash/find'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

export default {
  components: {
    HintColorizer
  },
  props: {
    worker: {
      type: Object,
      required: true
    },
    volumeTypes: {
      type: Array,
      default: () => []
    },
    cloudProfileName: {
      type: String
    }
  },
  data () {
    return {
      valid: undefined,
      workerIops: undefined
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapGetters([
      'cloudProfileByName'
    ]),
    validators () {
      return {
        worker: {
          volume: {
            type: {
              required
            }
          }
        },
        workerIops: {
          required: requiredIf(() => {
            return this.isAWS && this.worker.volume.type === 'io1'
          }),
          minValue: minValue(100)
        }
      }
    },
    validationErrors () {
      return {
        worker: {
          volume: {
            type: {
              required: 'Volume Type is required'
            }
          }
        },
        workerIops: {
          required: 'IOPS is required for volumes of type io1',
          minValue: 'Minimum IOPS is 100'
        }
      }
    },
    volumeTypeItems () {
      const volumeTypes = this.volumeTypes.slice()
      if (this.notInCloudProfile) {
        volumeTypes.push({
          name: this.worker.volume.type
        })
      }
      this.onInputVolumeType()
      return volumeTypes
    },
    notInCloudProfile () {
      return !find(this.volumeTypes, ['name', this.worker.volume.type])
    },
    hint () {
      if (this.notInCloudProfile) {
        return 'This volume type may not be supported by your worker'
      }
      return undefined
    },
    isAWS () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      return get(cloudProfile, 'metadata.cloudProviderKind') === 'aws'
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputVolumeType () {
      this.$v.worker.volume.type.$touch()
      this.$emit('updateVolumeType')
      this.validateInput()
    },
    onInputIops (value) {
      const iopsValue = parseInt(value)
      if (value && iopsValue > 0) {
        if (!this.worker.providerConfig) {
          this.worker.providerConfig = getWorkerProviderConfig('aws')
        }
        set(this.worker.providerConfig, 'volume.iops', iopsValue)
      } else {
        unset(this.worker.providerConfig, 'volume.iops')
      }
      this.$v.workerIops.$touch()
      this.$emit('updateVolumeType')
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.workerIops = get(this.worker, 'providerConfig.volume.iops')
    this.$v.$touch()
    this.validateInput()
  }
}
</script>
