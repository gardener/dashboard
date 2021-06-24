
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
      chips
      small-chips
      deletable-chips
    ></v-select>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import uniq from 'lodash/uniq'
import find from 'lodash/find'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

// The following runtime is a default that is always offered.
// Selecting a default Container / OCI Runtime will not create a CRI config in the shoot worker
// Currently, this is hard-coded in Gardener. Once this can be configured or default is removed, we need to adapt
const DEFAULT_CONTAINER_RUNTIME = 'docker'

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
      const containerRuntimes = map(this.machineImageCri, 'name')
      return uniq([...containerRuntimes, DEFAULT_CONTAINER_RUNTIME])
    },
    ociRuntimeItems () {
      const containerRuntime = find(this.machineImageCri, ['name', this.containerRuntime])
      const ociRuntimes = get(containerRuntime, 'containerRuntimes', [])
      return map(ociRuntimes, 'type')
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputContainerRuntime (value) {
      if (value && value !== DEFAULT_CONTAINER_RUNTIME) {
        set(this.worker, 'cri.name', value)
      } else {
        unset(this.worker, 'cri')
      }
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
    this.containerRuntime = get(this.worker, 'cri.name', DEFAULT_CONTAINER_RUNTIME)
    const ociRuntime = get(this.worker, 'cri.containerRuntimes')
    if (ociRuntime) {
      this.ociRuntime = map(ociRuntime, 'type')
    }
    this.$v.$touch()
    this.validateInput()
  }
}
</script>
