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

import isObject from 'lodash/isObject'
import forEach from 'lodash/forEach'
import every from 'lodash/every'
import map from 'lodash/map'
import isEmpty from 'lodash/isEmpty'
import fromPairs from 'lodash/fromPairs'
import set from 'lodash/set'
import get from 'lodash/get'

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
              set(compiledValidators, [validatorName], required)
              break
            case 'requiredIf':
              set(compiledValidators, [validatorName], requiredIf(() => !every(map(validator.not, fieldKey => get(this.fieldData, [fieldKey])))))
              break
            case 'isValidObject':
              set(compiledValidators, [validatorName], () => isEmpty(get(this.fieldData, [key])) || Object.keys(get(this.parsedInput, [key])).length > 0)
              break
            case 'regex':
              set(compiledValidators, [validatorName], value => !value || new RegExp(validator.value).test(value)) // eslint-disable-line security/detect-non-literal-regexp
          }
          if (validator.message) {
            set(compiledValidators, [validatorName], withMessage(validator.message, get(compiledValidators, [validatorName])))
          }
        })
        set(allValidators.fieldData, [key], withFieldName(label, compiledValidators))
      })
      return allValidators
    },
    parsedFieldData () {
      return fromPairs(map(this.fields, ({ key, type }) => {
        if (type === 'json' || type === 'yaml') {
          return [key, get(this.parsedInput, [key])]
        }
        return [key, get(this.fieldData, [key])]
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
              return [key, yaml.dump(get(value, [key]))]
            }
            if (type === 'json') {
              return [key, JSON.stringify(get(value, [key]))]
            }

            return [key, get(value, [key])]
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
          set(this.parsedInput, [key], yaml.load(get(this.fieldData, [key])))
        } else if (type === 'json') {
          set(this.parsedInput, [key], JSON.parse(get(this.fieldData, [key])))
        }
      } catch (err) {
        /* ignore errors */
      } finally {
        if (!isObject(get(this.parsedInput, [key]))) {
          set(this.parsedInput, [key], {})
        }
      }
      get(this.v$.fieldData, [key]).$touch()
    },
    toggleShowInputData (key) {
      set(this.showInputData, key, !get(this.showInputData, [key]))
    },
    getErrorMessages,
  },
}
</script>
