<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-text-field
    v-if="worker.volume.type !== 'gp2'"
    v-model.number="workerIops"
    class="ml-1"
    color="primary"
    :error-messages="getErrorMessages(v$.workerIops)"
    type="number"
    min="100"
    label="IOPS"
    variant="underlined"
    @update:model-value="onInputIops"
    @blur="v$.workerIops.$touch()"
  />
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  minValue,
  requiredIf,
} from '@vuelidate/validators'

import { createWorkerConfig } from '@/providers/infra/aws/shoot'
import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import set from 'lodash/set'
import unset from 'lodash/unset'

function requiresIops (volumeType) {
  return volumeType === 'io1' || volumeType === 'io2'
}

export default {
  props: {
    worker: {
      type: Object,
      required: true,
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
      workerIops: withFieldName(() => `${this.fieldName} IOPS`, {
        required: requiredIf(() => requiresIops(this.worker.volume.type)),
        minValue: minValue(100),
      }),
    }
  },
  watch: {
    'worker.providerConfig.volume.iops': {
      handler (iops) {
        this.workerIops = iops
        this.v$.workerIops?.$touch()
      },
      immediate: true,
    },
    'worker.volume.type' (volumeType) {
      if (!requiresIops(volumeType)) {
        this.unsetWorkerConfig()
      }
    },
  },
  methods: {
    onInputIops (value) {
      const iopsValue = parseInt(value)
      if (value && iopsValue > 0) {
        if (!this.worker.providerConfig) {
          this.worker.providerConfig = createWorkerConfig()
        }
        set(this.worker.providerConfig, ['volume', 'iops'], iopsValue)
      } else {
        this.unsetWorkerConfig()
      }
      this.v$.workerIops.$touch()
      this.$emit('updateVolumeType')
    },
    unsetWorkerConfig () {
      unset(this.worker, ['providerConfig'])
      this.workerIops = undefined
    },
    getErrorMessages,
  },
}
</script>
