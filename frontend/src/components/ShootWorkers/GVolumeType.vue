<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      v-model="worker.volume.type"
      v-messages-color="{ color: 'warning' }"
      color="primary"
      item-color="primary"
      :items="volumeTypeItems"
      item-title="name"
      item-value="name"
      :error-messages="errors['worker.volume.type']"
      label="Volume Type"
      :hint="hint"
      persistent-hint
      variant="underlined"
      @update:model-value="onInputVolumeType"
      @blur="v$.worker.volume.type.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <v-list-item-subtitle v-if="item.raw.class">
            Class: {{ item.raw.class }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-select>
    <v-text-field
      v-if="isAWS"
      v-model.number="workerIops"
      class="ml-1"
      color="primary"
      :error-messages="errors.workerIops"
      type="number"
      min="100"
      label="IOPS"
      variant="underlined"
      @input="onInputIops"
      @blur="v$.workerIops.$touch()"
    />
  </div>
</template>

<script>
import { mapActions } from 'pinia'
import {
  required,
  requiredIf,
  minValue,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { getVuelidateErrors } from '@/utils'
import { getWorkerProviderConfig } from '@/utils/createShoot'
import { withFieldName } from '@/utils/validators'

import {
  find,
  get,
  set,
  unset,
} from '@/lodash'

export default {
  props: {
    worker: {
      type: Object,
      required: true,
    },
    volumeTypes: {
      type: Array,
      default: () => [],
    },
    cloudProfileName: {
      type: String,
    },
    fieldName: {
      type: String,
    },
  },
  emits: [
    'updateVolumeType',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      workerIops: undefined,
    }
  },
  validations () {
    return {
      worker: {
        volume: {
          type: withFieldName(() => this.fieldName, {
            required,
          }),
        },
      },
      workerIops: withFieldName(() => `${this.fieldName} IOPS`, {
        required: requiredIf(() => {
          return this.isAWS && this.worker.volume.type === 'io1'
        }),
        minValue: minValue(100),
      }),
    }
  },
  computed: {
    volumeTypeItems () {
      const volumeTypes = this.volumeTypes.slice()
      if (this.notInCloudProfile) {
        volumeTypes.push({
          name: this.worker.volume.type,
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
        return 'This volume type may not be supported by your worker as it is not supported by your current worker settings'
      }
      return ''
    },
    isAWS () {
      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      return get(cloudProfile, 'metadata.cloudProviderKind') === 'aws'
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  mounted () {
    this.workerIops = get(this.worker, 'providerConfig.volume.iops')
    this.v$.$touch()
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
    ]),
    onInputVolumeType () {
      this.v$.worker.volume.type.$touch()
      this.$emit('updateVolumeType')
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
      this.v$.workerIops.$touch()
      this.$emit('updateVolumeType')
    },
  },
}
</script>
