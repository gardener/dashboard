<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      v-model="criName"
      v-messages-color="{ color: 'warning' }"
      color="primary"
      item-color="primary"
      :items="criItems"
      :error-messages="getErrorMessages('criName')"
      label="Container Runtime"
      :hint="hint"
      persistent-hint
      variant="underlined"
      @update:model-value="onInputCriName"
      @blur="v$.criName.$touch()"
    >
      <template #item="{ props, item }">
        <v-list-item
          v-bind="props"
          :disabled="item.raw.disabled"
        />
      </template>
    </v-select>
    <v-select
      v-if="criContainerRuntimeTypes.length"
      v-model="selectedCriContainerRuntimeTypes"
      class="ml-1"
      color="primary"
      item-color="primary"
      :items="criContainerRuntimeTypes"
      label="Additional OCI Runtimes"
      multiple
      chips
      closable-chips
      variant="underlined"
    />
  </div>
</template>

<script>
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { getValidationErrors } from '@/utils'

import {
  find,
  map,
  get,
  set,
  unset,
  includes,
  isEmpty,
} from '@/lodash'

const validationErrors = {
  criName: {
    required: 'An explicit container runtime configuration is required',
  },
}

export default {
  props: {
    worker: {
      type: Object,
      required: true,
    },
    machineImageCri: {
      type: Array,
      default: () => [],
    },
    kubernetesVersion: {
      type: String,
      required: true,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      validationErrors,
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      return {
        criName: {
          required,
        },
      }
    },
    validCriNames () {
      return map(this.machineImageCri, 'name')
    },
    criItems () {
      const criItems = map(this.validCriNames, name => {
        return {
          value: name,
          title: name,
        }
      })
      if (this.criName && this.notInList) {
        criItems.push({
          value: this.criName,
          title: this.criName,
          disabled: true,
        })
      }
      return criItems
    },
    criContainerRuntimeTypes () {
      const containerRuntime = find(this.machineImageCri, ['name', this.criName])
      const ociRuntimes = get(containerRuntime, 'containerRuntimes', [])
      return map(ociRuntimes, 'type')
    },
    criName: {
      get () {
        return get(this.worker, 'cri.name')
      },
      set (value) {
        set(this.worker, 'cri', {
          ...this.worker.cri,
          name: value,
        })
      },
    },
    selectedCriContainerRuntimeTypes: {
      get () {
        const criContainerRuntimes = get(this.worker, 'cri.containerRuntimes')
        return criContainerRuntimes
          ? map(criContainerRuntimes, 'type')
          : undefined
      },
      set (value) {
        if (!isEmpty(value)) {
          const criContainerRuntimes = map(value, type => ({ type }))
          set(this.worker, 'cri.containerRuntimes', criContainerRuntimes)
        } else {
          unset(this.worker, 'cri.containerRuntimes')
        }
      },
    },
    notInList () {
      // notInList: selected value may have been removed from cloud profile or other worker changes do not support current selection anymore
      return !includes(this.validCriNames, this.criName)
    },
    hint () {
      if (this.notInList) {
        return 'The container runtime may not be supported by the selected machine image'
      }
      return undefined
    },
  },
  watch: {
    criItems (criItems) {
      this.v$.$touch()
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputCriName (value) {
      this.selectedCriContainerRuntimeTypes = undefined
      this.v$.criName.$touch()
    },
  },
}
</script>

