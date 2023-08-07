<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-autocomplete
    ref="autocomplete"
    v-model="internalValue"
    v-model:search-input="internalSearch"
    v-messages-color="{ color: 'warning' }"
    color="primary"
    item-color="primary"
    :items="machineTypeItems"
    item-title="name"
    item-value="name"
    :error-messages="getErrorMessages('internalValue')"
    :filter="filter"
    label="Machine Type"
    :hint="hint"
    persistent-hint
    variant="underlined"
    @update:model-value="v$.internalValue.$touch()"
    @blur="v$.internalValue.$touch()"
  >
    <template #item="{ item, props }">
      <v-list-item v-bind="props">
        <v-list-item-subtitle>
          <span v-if="item.raw.cpu">CPU: {{ item.raw.cpu }} | </span>
          <span v-if="item.raw.gpu">GPU: {{ item.raw.gpu }} | </span>
          <span v-if="item.raw.memory">Memory: {{ item.raw.memory }}</span>
          <span v-if="item.raw.storage"> | Volume Type: {{ item.raw.storage.type }} | Class: {{ item.raw.storage.class }} | Default Size: {{ item.raw.storage.size }}</span>
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script>
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { getValidationErrors } from '@/utils'
import find from 'lodash/find'

const validationErrors = {
  internalValue: {
    required: 'Machine Type is required',
  },
}

export default {
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    searchInput: {
      type: String,
    },
    machineTypes: {
      type: Array,
      default: () => [],
    },
  },
  emits: [
    'update:search-input',
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      lazyValue: this.modelValue,
      lazySearch: this.searchInput,
      validationErrors,
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value ?? ''
        this.$emit('update:modelValue', this.lazyValue)
      },
    },
    internalSearch: {
      get () {
        return this.lazySearch
      },
      set (value) {
        if (this.lazySearch !== value) {
          this.lazySearch = value
          this.$emit('update:search-input', value)
        }
      },
    },
    machineTypeItems () {
      const machineTypes = [...this.machineTypes]
      if (this.notInList && this.internalValue) {
        machineTypes.push({
          name: this.internalValue,
        })
      }
      return machineTypes
    },
    notInList () {
      // notInList: selected value may have been removed from cloud profile or other worker changes do not support current selection anymore
      return !find(this.machineTypes, ['name', this.internalValue])
    },
    hint () {
      return this.notInList ? 'This machine type may not be supported by your worker as it is not supported by your current worker settings' : ''
    },
    validators () {
      return {
        internalValue: {
          required,
        },
      }
    },
  },
  validations () {
    return this.validators
  },
  watch: {
    modelValue (value) {
      this.lazyValue = value
    },
    searchInput (value) {
      this.lazySearch = value
    },
  },
  mounted () {
    this.v$.internalValue.$touch()
    const input = this.$refs.autocomplete?.$refs.input
    if (input) {
      input.spellcheck = false
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    filter (item, query) {
      if (!item) {
        return false
      }
      if (typeof query !== 'string') {
        return true
      }
      const name = item.name?.toLowerCase()
      const terms = query.trim().split(/ +/).map(term => term.toLowerCase())
      const properties = []
      const addProperty = value => {
        if (value) {
          properties.push(value.toString().toLowerCase())
        }
      }
      addProperty(item.cpu)
      addProperty(item.gpu)
      addProperty(item.memory)
      if (item.storage) {
        addProperty(item.storage.type)
        addProperty(item.storage.class)
        addProperty(item.storage.size)
      }

      return terms.every(term => name?.includes(term) || properties.includes(term))
    },
  },
}
</script>
