
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
      v-model="ociRuntimes"
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
    kubernetesVersion: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined
    }
  },
  validations,
  computed: {
    containerRuntimeItems () {
      return map(this.machineImageCri, 'name')
    },
    ociRuntimeItems () {
      const containerRuntime = find(this.machineImageCri, ['name', this.containerRuntime])
      const ociRuntimess = get(containerRuntime, 'containerRuntimes', [])
      return map(ociRuntimess, 'type')
    },
    containerRuntime: {
      get () {
        return get(this.worker, 'cri.name')
      },
      set (value) {
        set(this.worker, 'cri.name', value)
      }
    },
    ociRuntimes: {
      get () {
        const ociRuntimes = get(this.worker, 'cri.containerRuntimes')
        if (!ociRuntimes) {
          return undefined
        }
        return map(ociRuntimes, 'type')
      },
      set (value) {
        if (value && value.length) {
          const containerRuntimes = map(value, ociRuntimes => ({ type: ociRuntimes }))
          set(this.worker, 'cri.containerRuntimes', containerRuntimes)
        } else {
          unset(this.worker, 'cri.containerRuntimes')
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputContainerRuntime (value) {
      this.ociRuntimes = undefined
      this.$v.containerRuntime.$touch()
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
    this.$v.$touch()
    this.validateInput()
  },
  watch: {
    containerRuntimeItems (containerRuntimeItems) {
      if (!includes(containerRuntimeItems, this.containerRuntime)) {
        this.containerRuntime = defaultCRIForWorker(this.kubernetesVersion, this.containerRuntimeItems)
        this.onInputContainerRuntime()
      }
    }
  }
}
</script>
