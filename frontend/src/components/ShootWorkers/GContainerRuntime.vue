<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    class="d-flex flex-row"
  >
    <v-select
      v-model="criName"
      v-messages-color="{ color: 'warning' }"
      style="flex: 0 0 125px"
      color="primary"
      item-color="primary"
      :items="criItems"
      :error-messages="getErrorMessages(v$.criName)"
      label="Container Runtime"
      :hint="hint"
      persistent-hint
      variant="underlined"
      @update:model-value="onInputCriName"
      @blur="v$.criName.$touch()"
    />
    <v-select
      v-if="criContainerRuntimeTypes.length"
      v-model="selectedCriContainerRuntimeTypes"
      class="ml-1"
      style="flex: 0 0 125px"
      color="primary"
      item-color="primary"
      :items="criContainerRuntimeTypes"
      label="Add. OCI Runtimes"
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

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import find from 'lodash/find'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'

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
    fieldName: {
      type: String,
    },
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  validations () {
    return {
      criName: withFieldName(() => this.fieldName, {
        required,
      }),
    }
  },
  computed: {
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
          props: {
            disabled: true,
          },
        })
      }
      return criItems
    },
    criContainerRuntimeTypes () {
      const containerRuntime = find(this.machineImageCri, ['name', this.criName])
      const ociRuntimes = get(containerRuntime, ['containerRuntimes'], [])
      return map(ociRuntimes, 'type')
    },
    criName: {
      get () {
        return get(this.worker, ['cri', 'name'])
      },
      set (value) {
        set(this.worker, ['cri'], {
          ...this.worker.cri,
          name: value,
        })
      },
    },
    selectedCriContainerRuntimeTypes: {
      get () {
        const criContainerRuntimes = get(this.worker, ['cri', 'containerRuntimes'])
        return criContainerRuntimes
          ? map(criContainerRuntimes, 'type')
          : undefined
      },
      set (value) {
        if (!isEmpty(value)) {
          const criContainerRuntimes = map(value, type => ({ type }))
          set(this.worker, ['cri', 'containerRuntimes'], criContainerRuntimes)
        } else {
          unset(this.worker, ['cri', 'containerRuntimes'])
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
    onInputCriName (value) {
      this.selectedCriContainerRuntimeTypes = undefined
      this.v$.criName.$touch()
    },
    getErrorMessages,
  },
}
</script>
