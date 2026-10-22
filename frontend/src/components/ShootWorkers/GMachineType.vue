<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-autocomplete
    ref="autocomplete"
    v-model="internalValue"
    v-messages-color="{ color: 'warning' }"
    auto-select-first
    color="primary"
    item-color="primary"
    :items="machineTypeItems"
    item-title="name"
    item-value="name"
    :search="search"
    :error-messages="getErrorMessages(validation)"
    :custom-filter="customFilter"
    label="Machine Type"
    :hint="hint"
    persistent-hint
    variant="underlined"
    @blur="validation.$touch()"
  >
    <template #item="{ item, props }">
      <v-list-item v-bind="props">
        <v-list-item-subtitle>
          <span v-if="item.cpu">CPU: {{ item.cpu }} | </span>
          <span v-if="item.gpu">GPU: {{ item.gpu }} | </span>
          <span v-if="item.memory">Memory: {{ item.memory }}</span>
          <span v-if="item.storage"> | Volume Type: {{ item.storage.type }} | Class: {{ item.storage.class }} | Default Size: {{ item.storage.size }}</span>
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script>
import { getErrorMessages } from '@/utils'

import find from 'lodash/find'

export default {
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    machineTypes: {
      type: Array,
      default: () => [],
    },
    validation: {
      type: Object,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      lazyValue: this.modelValue,
      search: '',
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value ?? ''
        this.validation.$touch()
        this.$emit('update:modelValue', this.lazyValue)
      },
    },
    machineTypeItems () {
      const machineTypes = [
        ...this.machineTypes,
      ]
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
  },
  watch: {
    modelValue (value) {
      if (this.lazyValue !== value) {
        this.lazyValue = value
      }
    },
  },
  mounted () {
    this.validation.$touch()
    const input = this.$refs.autocomplete?.$refs.input
    if (input) {
      input.spellcheck = false
    }
  },
  methods: {
    customFilter (_, query, internalItem) {
      const item = internalItem.raw
      if (!item) {
        return false
      }
      if (typeof query !== 'string') {
        return true
      }
      const name = item.name?.toLowerCase()
      const terms = query
        .trim()
        .split(/ +/)
        .map(term => term.toLowerCase())
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

      const includesTerm = term => name?.includes(term) || properties.includes(term)
      return terms.every(includesTerm)
    },
    getErrorMessages,
  },
}
</script>
