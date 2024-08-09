<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <component
    :is="wrapper"
    v-for="{ key, label, hint, type, items } in parsedFields"
    :key="key"
    v-bind="wrapperProps"
  >
    <v-text-field
      v-if="type === 'text' || type === 'password'"
      v-bind="inputProps"
      v-model="fieldData[key]"
      color="primary"
      :label="label"
      :error-messages="getErrorMessages(v$.fieldData[key])"
      :append-icon="type === 'password' ? showInputData[key] ? 'mdi-eye' : 'mdi-eye-off' : undefined"
      :type="type === 'password' && !showInputData[key] ? 'password' : 'text'"
      :hint="hint"
      @click:append="toggleShowInputData(key)"
      @update:model-value="v$.fieldData[key].$touch()"
      @blur="v$.fieldData[key].$touch()"
    />
    <v-select
      v-if="type === 'select' || type === 'select-multiple'"
      v-bind="inputProps"
      v-model="fieldData[key]"
      color="primary"
      item-color="primary"
      :label="label"
      :items="items"
      :hint="hint"
      :error-messages="getErrorMessages(v$.fieldData[key])"
      :multiple="type === 'select-multiple'"
      @update:model-value="v$.fieldData[key].$touch()"
      @blur="v$.fieldData[key].$touch()"
    />
    <v-textarea
      v-if="type === 'yaml' || type === 'json'"
      v-bind="inputProps"
      v-model="fieldData[key]"
      color="primary"
      :label="label"
      :error-messages="getErrorMessages(v$.fieldData[key])"
      :hint="hint"
      @update:model-value="onInputTextarea(key, type)"
      @blur="v$.fieldData[key].$touch()"
    />
  </component>
</template>

<script>
import { VCol } from 'vuetify/components'
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { mapActions } from 'pinia'
import yaml from 'js-yaml'

import { useCloudProfileStore } from '@/store/cloudProfile'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import {
  isObject,
  forEach,
  every,
  map,
  isEmpty,
  fromPairs,
  set,
  get,
} from '@/lodash'

export default {
  components: {
    VCol,
  },
  props: {
    fields: {
      type: Array,
    },
    modelValue: {
      type: Object,
      required: true,
    },
    wrapper: {
      type: String,
      default: 'div',
    },
    wrapperProps: {
      type: Object,
    },
    inputProps: {
      type: Object,
    },
    cloudProfileName: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      parsedInput: {},
      showInputData: {},
      fieldData: {},
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    validators () {
      const allValidators = {
        fieldData: {},
      }
      forEach(this.fields, ({ key, label, validators }) => {
        const compiledValidators = {}
        forEach(validators, (validator, validatorName) => {
          switch (validator.type) {
            case 'required':
              compiledValidators[validatorName] = required
              break
            case 'requiredIf':
              compiledValidators[validatorName] = requiredIf(() => !every(map(validator.not, fieldKey => this.fieldData[fieldKey])))
              break
            case 'isValidObject':
              compiledValidators[validatorName] = () => isEmpty(this.fieldData[key]) || Object.keys(this.parsedInput[key]).length > 0
              break
            case 'regex':
              compiledValidators[validatorName] = value => !value || new RegExp(validator.value).test(value)
          }
          if (validator.message) {
            compiledValidators[validatorName] = withMessage(validator.message, compiledValidators[validatorName])
          }
        })
        allValidators.fieldData[key] = withFieldName(label, compiledValidators)
      })
      return allValidators
    },
    parsedFieldData () {
      return fromPairs(map(this.fields, ({ key, type }) => {
        if (type === 'json' || type === 'yaml') {
          return [key, this.parsedInput[key]]
        }
        return [key, this.fieldData[key]]
      }))
    },
    parsedFields () {
      return map(this.fields, field => {
        let items
        if (Array.isArray(field.values)) {
          items = field.values
        } else if (field.values?.cloudprofilePath) {
          const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
          const values = get(cloudProfile, field.values.cloudprofilePath)
          items = map(values, field.values.key)
        }
        return {
          ...field,
          items,
        }
      })
    },
  },
  watch: {
    fieldData: {
      deep: true,
      handler () {
        this.$emit('update:modelValue', this.parsedFieldData)
      },
    },
    parsedInput: {
      deep: true,
      handler () {
        this.$emit('update:modelValue', this.parsedFieldData)
      },
    },
    modelValue: {
      handler (value) {
        if (isEmpty(this.fieldData)) {
          // set initial data
          const fieldData = fromPairs(map(this.fields, ({ key, type }) => {
            if (type === 'yaml') {
              return [key, yaml.dump(value[key])]
            }
            if (type === 'json') {
              return [key, JSON.stringify(value[key])]
            }

            return [key, value[key]]
          }))
          this.fieldData = fieldData
        }
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
    ]),
    onInputTextarea (key, type) {
      set(this.parsedInput, key, {})
      try {
        if (type === 'yaml') {
          this.parsedInput[key] = yaml.load(this.fieldData[key])
        } else if (type === 'json') {
          this.parsedInput[key] = JSON.parse(this.fieldData[key])
        }
      } catch (err) {
        /* ignore errors */
      } finally {
        if (!isObject(this.parsedInput[key])) {
          this.parsedInput[key] = {}
        }
      }
      this.v$.fieldData[key].$touch()
    },
    toggleShowInputData (key) {
      set(this.showInputData, key, !this.showInputData[key])
    },
    getErrorMessages,
  },
}
</script>
