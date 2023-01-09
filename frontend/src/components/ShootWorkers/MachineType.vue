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
      item-text="name"
      item-value="name"
      :error-messages="getErrorMessages('internalValue')"
      @input="$v.internalValue.$touch()"
      @blur="$v.internalValue.$touch()"
      v-model="internalValue"
      :search-input.sync="internalSearch"
      :filter="filter"
      label="Machine Type"
      :hint="hint"
      persistent-hint
    >
      <template v-slot:prepend-item>
        <div class="d-flex filter-div">
          <v-select
            v-if="cpuItems.length > 2"
            class="ma-1"
            :items="cpuItems"
            v-model="cpuFilter"
            label="CPU Filter"
          >
          </v-select>
          <v-select
            v-if="memoryItems.length > 2"
            class="ma-1"
            :items="memoryItems"
            v-model="memoryFilter"
            label="Memory Filter"
          >
          </v-select>
          <v-select
            v-if="gpuItems.length > 2"
            class="ma-1"
            :items="gpuItems"
            v-model="gpuFilter"
            label="GPU Filter"
          >
          </v-select>
        </div>
      </template>
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
import HintColorizer from '@/components/HintColorizer'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import find from 'lodash/find'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import filter from 'lodash/filter'

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
      validationErrors,
      cpuFilter: 'all',
      gpuFilter: 'all',
      memoryFilter: 'all'
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
      let machineTypes = [...this.machineTypes]
      if (this.notInList && this.internalValue) {
        machineTypes.push({
          name: this.internalValue
        })
      }

      if (this.cpuFilter !== 'all') {
        machineTypes = filter(machineTypes, ['cpu', this.cpuFilter])
      }
      if (this.gpuFilter !== 'all') {
        machineTypes = filter(machineTypes, ['gpu', this.gpuFilter])
      }
      if (this.memoryFilter !== 'all') {
        machineTypes = filter(machineTypes, ['memory', this.memoryFilter])
      }

      return machineTypes
    },
    notInList () {
      // notInList: selected value may have been removed from cloud profile or other worker changes do not support current selection anymore
      return !find(this.machineTypes, ['name', this.internalValue])
    },
    hint () {
      return this.notInList ? 'This machine type may not be supported by your worker' : ''
    },
    cpuItems () {
      const cpuItems = uniq(map(this.machineTypes, 'cpu'))
      return ['all', ...cpuItems.sort((a, b) => (a - b))]
    },
    gpuItems () {
      const gpuItems = uniq(map(this.machineTypes, 'gpu'))
      return ['all', ...gpuItems.sort((a, b) => (a - b))]
    },
    memoryItems () {
      const memoryItems = uniq(map(this.machineTypes, 'memory'))
      return ['all', ...memoryItems.sort((a, b) => this.rawMemoryValue(a) - this.rawMemoryValue(b))]
    }
  },
  validations,
  methods: {
    rawMemoryValue (memoryString) {
      let memoryVal = memoryString.replace(/\D/g, '')
      if (memoryString.includes('Gi')) {
        memoryVal = memoryVal * 1024
      }
      if (memoryString.includes('Ti')) {
        memoryVal = memoryVal * 1024 * 1024
      }

      return memoryVal
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    filter (item, query) {
      if (query === this.internalValue) {
        return true
      }
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

<style lang="scss" scoped>

  .filter-div {
    width: 400px;
  }

</style>
