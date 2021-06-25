
<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      color="primary"
      item-color="primary"
      :items="containerRuntimeItems"
      :error-messages="getErrorMessages('containerRuntime')"
      @input="onInputContainerRuntime"
      @blur="$v.containerRuntime.$touch()"
      v-model="containerRuntime"
      label="Container Runtime"
      :disabled="immutableCri"
      :hint="criHint"
      persistent-hint
    ></v-select>
    <v-select
      v-if="ociRuntimeItems.length"
      class="ml-1"
      color="primary"
      item-color="primary"
      :items="ociRuntimeItems"
      @input="onInputOciRuntime"
      v-model="ociRuntime"
      label="Additional OCI Runtimes"
      multiple
      :disabled="immutableCri"
      :hint="ociHint"
      persistent-hint
      chips
      small-chips
      deletable-chips
    ></v-select>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, defaultCRIForWorker } from '@/utils'
import find from 'lodash/find'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import includes from 'lodash/includes'

const validationErrors = {
  containerRuntime: {
    required: 'Container Runtime is required'
  }
}

const validations = {
  containerRuntime: {
    required
  }
}

export default {
  props: {
    worker: {
      type: Object,
      required: true
    },
    machineImageCri: {
      type: Array,
      default: () => []
    },
    immutableCri: {
      type: Boolean,
      default: false
    },
    kubernetesVersion: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined,
      containerRuntime: undefined,
      ociRuntime: undefined
    }
  },
  validations,
  computed: {
    containerRuntimeItems () {
      return map(this.machineImageCri, 'name')
    },
    ociRuntimeItems () {
      const containerRuntime = find(this.machineImageCri, ['name', this.containerRuntime])
      const ociRuntimes = get(containerRuntime, 'containerRuntimes', [])
      return map(ociRuntimes, 'type')
    },
    criHint () {
      if (this.immutableCri) {
        return 'Container runtime cannot be changed after worker has been created'
      }
      return undefined
    },
    ociHint () {
      if (this.immutableCri) {
        return 'OCI runtimes cannot be changed after worker has been created'
      }
      return undefined
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputContainerRuntime (value) {
      console.log('TEST')
      this.worker.cri.name = value
      this.ociRuntime = undefined
      this.$v.containerRuntime.$touch()
      this.validateInput()
    },
    onInputOciRuntime (value) {
      if (value.length) {
        const containerRuntimes = map(value, ociRuntime => ({ type: ociRuntime }))
        set(this.worker, 'cri.containerRuntimes', containerRuntimes)
      } else {
        unset(this.worker, 'cri.containerRuntimes')
      }
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.containerRuntime = get(this.worker, 'cri.name', defaultCRIForWorker(this.kubernetesVersion, this.containerRuntimeItems))
    const ociRuntime = get(this.worker, 'cri.containerRuntimes')
    if (ociRuntime) {
      this.ociRuntime = map(ociRuntime, 'type')
    }
    this.$v.$touch()
    this.validateInput()
  },
  watch: {
    containerRuntimeItems (containerRuntimeItems) {
      if (!includes(containerRuntimeItems, this.containerRuntime)) {
        this.containerRuntime = get(this.worker, 'cri.name', defaultCRIForWorker(this.kubernetesVersion, containerRuntimeItems))
      }
    }
  }
}
</script>
