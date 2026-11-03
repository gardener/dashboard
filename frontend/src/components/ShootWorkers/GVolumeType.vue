<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

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
      :error-messages="getErrorMessages(volumeTypeValidation)"
      label="Volume Type"
      :hint="hint"
      persistent-hint
      persistent-placeholder
      variant="underlined"
      @update:model-value="onInputVolumeType"
      @blur="volumeTypeValidation.$touch()"
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
      v-if="isAWS && worker.volume.type !== 'gp2'"
      v-model.number="workerIops"
      class="ml-4"
      style="width: 80px;"
      color="primary"
      :error-messages="getErrorMessages(iopsValidation)"
      type="number"
      min="100"
      label="IOPS"
      hint="I/O operations per second"
      persistent-placeholder
      variant="underlined"
      @update:model-value="onInputIops"
      @blur="iopsValidation.$touch()"
    />
  </div>
</template>

<script>
import { mapActions } from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { getErrorMessages } from '@/utils'
import { getWorkerProviderConfig } from '@/utils/shoot'

import find from 'lodash/find'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

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
    volumeTypeValidation: {
      type: Object,
      required: true,
    },
    iopsValidation: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'updateVolumeType',
  ],
  data () {
    return {
      workerIops: undefined,
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
      const cloudProfile = this.cloudProfileByRef(this.cloudProfileRef)
      return get(cloudProfile, ['spec', 'type']) === 'aws'
    },
  },
  watch: {
    'worker.providerConfig.volume.iops': {
      handler (iops) {
        this.workerIops = iops
        this.iopsValidation.$touch()
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByRef',
    ]),
    onInputVolumeType () {
      this.volumeTypeValidation.$touch()
      this.$emit('updateVolumeType')
    },
    onInputIops (value) {
      const iopsValue = parseInt(value)
      if (value && iopsValue > 0) {
        if (!this.worker.providerConfig) {
          this.worker.providerConfig = getWorkerProviderConfig('aws')
        }
        set(this.worker.providerConfig, ['volume', 'iops'], iopsValue)
      } else {
        unset(this.worker.providerConfig, ['volume', 'iops'])
      }
      this.iopsValidation.$touch()
      this.$emit('updateVolumeType')
    },
    getErrorMessages,
  },
}
</script>
