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
    <component
      :is="workerVolumeComponent"
      v-if="workerVolumeComponent"
      :worker="worker"
      :field-name="fieldName"
      @update-volume-type="$emit('updateVolumeType')"
    />
  </div>
</template>

<script>
import { mapActions } from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'
import { getInfrastructureProviderUi } from '@/providers/infra/ui'

import find from 'lodash/find'
import get from 'lodash/get'

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
  validations () {
    return {
      worker: {
        volume: {
          type: withFieldName(() => this.fieldName, {
            required,
          }),
        },
      },
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
    workerVolumeComponent () {
      return getInfrastructureProviderUi(this.providerType)?.workerVolumeComponent
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByRef',
    ]),
    onInputVolumeType () {
      this.v$.worker.volume.type.$touch()
      this.$emit('updateVolumeType')
    },
    getErrorMessages,
  },
}
</script>
