<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <hint-colorizer hint-color="warning">
    <v-autocomplete
      ref="autocomplete"
      color="primary"
      item-color="primary"
      :items="machineTypeItems"
      item-title="name"
      item-value="name"
      :error-messages="getErrorMessages('internalValue')"
      @update:model-value="$v.internalValue.$touch()"
      @blur="$v.internalValue.$touch()"
      v-model="internalValue"
      v-model:search-input="internalSearch"
      :customFilter="filter"
      label="Machine Type"
      :hint="hint"
      persistent-hint
    >
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>
            {{item.name}}
          </v-list-item-title>
          <v-list-item-subtitle>
            <span v-if="item.cpu">CPU: {{item.cpu}} | </span>
            <span v-if="item.gpu">GPU: {{item.gpu}} | </span>
            <span v-if="item.memory">Memory: {{item.memory}}</span>
            <span v-if="item.storage"> | Volume Type: {{item.storage.type}} | Class: {{item.storage.class}} | Default Size: {{item.storage.size}}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-autocomplete>
  </hint-colorizer>
</template>

<script>
import HintColorizer from '@/components/HintColorizer.vue'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import find from 'lodash/find'

const validationErrors = {
  internalValue: {
    required: 'Machine Type is required'
  }
}

const validations = {
  internalValue: {
    required
  }
}

export default {
  components: {
    HintColorizer
  },
  props: {
    value: {
      type: String,
      required: true
    },
    searchInput: {
      type: String
    },
    valid: {
      type: Boolean
    },
    machineTypes: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      lazyValue: this.value,
      lazySearch: this.searchInput,
      validationErrors
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.lazyValue
      },
      set (value) {
        this.lazyValue = value ?? ''
        this.$emit('input', this.lazyValue)
      }
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
      }
    },
    machineTypeItems () {
      const machineTypes = [...this.machineTypes]
      if (this.notInList && this.internalValue) {
        machineTypes.push({
          name: this.internalValue
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
    }
  },
  validations,
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
    }
  },
  mounted () {
    this.$v.internalValue.$touch()
    const input = this.$refs.autocomplete?.$refs.input
    if (input) {
      input.spellcheck = false
    }
  },
  watch: {
    value (value) {
      this.lazyValue = value
    },
    searchInput (value) {
      this.lazySearch = value
    },
    '$v.internalValue.$invalid': {
      handler (value) {
        this.$emit('update:valid', !value)
      },
      // force eager callback execution https://vuejs.org/guide/essentials/watchers.html#eager-watchers
      immediate: true
    }
  }
}
</script>
