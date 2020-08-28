<template>
  <div class="d-flex flex-row">
    <v-select
      color="cyan darken-2"
      item-color="cyan darken-2"
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
      color="cyan darken-2"
      item-color="cyan darken-2"
      :items="ociRuntimeItems"
      :error-messages="getErrorMessages('ociRuntime')"
      @input="onInputOciRuntime"
      @blur="$v.ociRuntime.$touch()"
      v-model="ociRuntime"
      label="OCI Runtime"
      multiple
    ></v-select>
  </div>
</template>

<script>
import { required, requiredIf } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import uniq from 'lodash/uniq'
import find from 'lodash/find'
import map from 'lodash/map'
import isEqual from 'lodash/isEqual'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'

// The following runtimes are defaults that are always offered.
// Selecting a default Container / OCI Runtime will not create a CRI config in the shoot worker
const DEFAULT_CONTAINER_RUNTIME = 'docker'
const DEFAULT_OCI_RUNTIME = 'runc'

const validationErrors = {
  containerRuntime: {
    required: 'Container Runtime is required'
  },
  ociRuntime: {
    required: 'OCI Runtime is required'
  }
}

const validations = {
  containerRuntime: {
    required
  },
  ociRuntime: {
    required: requiredIf(function () {
      return this.ociRuntimeItems.length
    })
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
      if (this.containerRuntime === DEFAULT_CONTAINER_RUNTIME) {
        return [DEFAULT_OCI_RUNTIME]
      }
      const containerRuntime = find(this.machineImageCri, { name: this.containerRuntime })
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
      if (value.length && !isEqual(value, [DEFAULT_OCI_RUNTIME])) {
        const containerRuntimes = map(value, ociRuntime => ({ type: ociRuntime }))
        set(this.worker, 'cri.containerRuntimes', containerRuntimes)
      } else {
        unset(this.worker, 'cri.containerRuntimes')
      }
      this.$v.ociRuntime.$touch()
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
    this.containerRuntime = get(this.worker, 'cri.name', DEFAULT_CONTAINER_RUNTIME)
    const ociRuntime = get(this.worker, 'cri.containerRuntimes')
    if (ociRuntime) {
      this.ociRuntime = map(ociRuntime, 'type')
    } else {
      this.ociRuntime = [DEFAULT_OCI_RUNTIME]
    }
    this.$v.$touch()
    this.validateInput()
  }
}
</script>
