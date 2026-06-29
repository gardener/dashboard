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
      :error-messages="getErrorMessages(v$.worker.volume.type)"
      label="Volume Type"
      :hint="hint"
      persistent-hint
      variant="underlined"
      @update:model-value="onInputVolumeType"
      @blur="v$.worker.volume.type.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <v-list-item-subtitle v-if="item.class">
            Class: {{ item.class }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-select>
    <v-text-field
      v-if="showIops"
      v-model.number="workerIops"
      class="ml-1"
      color="primary"
      :error-messages="getErrorMessages(v$.workerIops)"
      type="number"
      :min="minIops"
      label="IOPS"
      variant="underlined"
      @update:model-value="onInputIops"
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
import { useConfigStore } from '@/store/config'

import { getErrorMessages } from '@/utils'
import { getWorkerProviderConfig } from '@/utils/shoot'
import { withFieldName } from '@/utils/validators'

import find from 'lodash/find'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import cloneDeep from 'lodash/cloneDeep'

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
    cloudProfileRef: {
      type: Object,
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
          return this.isIopsRequired
        }),
        minValue: minValue(this.minIops),
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
    providerType () {
      const cloudProfile = this.cloudProfileByRef(this.cloudProfileRef)
      return get(cloudProfile, ['spec', 'type'])
    },
    providerVendor () {
      if (!this.providerType) {
        return undefined
      }
      return this.vendorDetails({
        type: 'infra',
        name: this.providerType,
      })
    },
    iopsConfig () {
      return get(this.providerVendor, ['shoot', 'workerVolume', 'iops'])
    },
    showIops () {
      if (!this.iopsConfig) {
        return false
      }
      const hiddenForVolumeTypes = get(this.iopsConfig, ['hiddenForVolumeTypes'], [])
      return !hiddenForVolumeTypes.includes(this.worker.volume.type)
    },
    minIops () {
      return get(this.iopsConfig, ['min'], 100)
    },
    isIopsRequired () {
      if (!this.showIops) {
        return false
      }
      const requiredForVolumeTypes = get(this.iopsConfig, ['requiredForVolumeTypes'], [])
      return requiredForVolumeTypes.includes(this.worker.volume.type)
    },
  },
  watch: {
    'worker.providerConfig.volume.iops': {
      handler (iops) {
        this.workerIops = iops
        this.v$.workerIops?.$touch()
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByRef',
    ]),
    ...mapActions(useConfigStore, [
      'vendorDetails',
    ]),
    onInputVolumeType () {
      this.v$.worker.volume.type.$touch()
      this.$emit('updateVolumeType')
    },
    onInputIops (value) {
      const iopsValue = parseInt(value)
      if (value && iopsValue > 0) {
        if (!this.worker.providerConfig) {
          this.worker.providerConfig = cloneDeep(getWorkerProviderConfig(this.providerVendor)) ?? {}
        }
        set(this.worker.providerConfig, ['volume', 'iops'], iopsValue)
      } else {
        unset(this.worker.providerConfig, ['volume', 'iops'])
      }
      this.v$.workerIops.$touch()
      this.$emit('updateVolumeType')
    },
    getErrorMessages,
  },
}
</script>
