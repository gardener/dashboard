<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :secret-validations="v$"
    :secret="secret"
    :vendor="vendor"
  >
    <template #secret-slot>
      <template v-if="customCloudProviderFields">
        <div
          v-for="{ key, label, hint, type } in customCloudProviderFields"
          :key="key"
        >
          <v-text-field
            v-if="type === 'text' || type === 'password'"
            v-model="customCloudProviderData[key]"
            color="primary"
            :label="label"
            :error-messages="getErrorMessages(v$.customCloudProviderData[key])"
            :append-icon="type === 'password' ? showSecrets[key] ? 'mdi-eye' : 'mdi-eye-off' : undefined"
            :type="type === 'password' && !showSecrets[key] ? 'password' : 'text'"
            :hint="hint"
            @click:append="toggleShowSecrets(key)"
            @update:model-value="v$.customCloudProviderData[key].$touch()"
            @blur="v$.customCloudProviderData[key].$touch()"
          />
          <v-textarea
            v-if="type === 'yaml' || type === 'json'"
            v-model="customCloudProviderData[key]"
            color="primary"
            :label="label"
            :error-messages="getErrorMessages(v$.customCloudProviderData[key])"
            :hint="hint"
            @update:model-value="onInputTextarea(key, type)"
            @blur="v$.customCloudProviderData[key].$touch()"
          />
        </div>
      </template>
    </template>
    <template #help-slot>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="helpHtml"
        class="markdown"
        v-html="helpHtml"
      />
      <div v-else>
        <p>
          This is a generic provider service account dialog.
        </p>
        <p>
          Please enter data required for {{ vendor }}.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { mapState } from 'pinia'

import { useConfigStore } from '@/store/config'

import GSecretDialog from '@/components/Secrets/GSecretDialog'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import {
  setDelayedInputFocus,
  transformHtml,
  getErrorMessages,
} from '@/utils'

import {
  isObject,
  forEach,
  get,
  every,
  map,
  isEmpty,
  fromPairs,
  set,
} from '@/lodash'

export default {
  components: {
    GSecretDialog,
  },
  inject: ['yaml'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
    vendor: {
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
      customCloudProviderData: {},
      customCloudProviderParsedData: {},
      showSecrets: {},
    }
  },
  validations () {
    return this.validators
  },
  computed: {
    ...mapState(useConfigStore, [
      'customCloudProviders',
    ]),
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    validationErrors () {
      const allValidationErrors = {
        customCloudProviderData: {},
      }
      forEach(this.customCloudProviderFields, ({ key, validationErrors }) => {
        allValidationErrors.customCloudProviderData[key] = validationErrors
      })
      return allValidationErrors
    },
    validators () {
      const allValidators = {
        customCloudProviderData: {},
      }
      forEach(this.customCloudProviderFields, ({ key, label, validators }) => {
        const compiledValidators = {}
        forEach(validators, (validator, validatorName) => {
          switch (validator.type) {
            case 'required':
              compiledValidators[validatorName] = required
              break
            case 'requiredIf':
              compiledValidators[validatorName] = requiredIf(() => !every(map(validator.not, fieldKey => this.customCloudProviderData[fieldKey])))
              break
            case 'isValidObject':
              compiledValidators[validatorName] = () => isEmpty(this.customCloudProviderData[key]) || Object.keys(this.customCloudProviderParsedData[key]).length > 0
              break
            case 'regex':
              compiledValidators[validatorName] = value => !value || new RegExp(validator.value).test(value)
          }
          if (validator.message) {
            compiledValidators[validatorName] = withMessage(validator.message, compiledValidators[validatorName])
          }
        })
        allValidators.customCloudProviderData[key] = withFieldName(label, compiledValidators)
      })
      return allValidators
    },
    customCloudProvider () {
      return get(this.customCloudProviders, this.vendor)
    },
    customCloudProviderFields () {
      const configuredFields = this.customCloudProvider?.secret?.fields
      if (configuredFields) {
        return configuredFields
      }
      return [
        {
          key: 'secret',
          label: 'Secret Data',
          hint: 'Provide secret data as YAML key-value pairs',
          type: 'yaml',
          validators: {
            required: {
              type: 'required',
            },
            isYAML: {
              type: 'isValidObject',
              message: 'You need to enter secret data as YAML key- value pairs',
            },
          },
        },
      ]
    },
    helpHtml () {
      return transformHtml(this.customCloudProvider?.secret?.help)
    },
    valid () {
      return !this.v$.$invalid
    },
    isCreateMode () {
      return !this.secret
    },
    secretData () {
      const data = fromPairs(map(this.customCloudProviderFields, ({ key, type }) => {
        if (type === 'json' || type === 'yaml') {
          return [key, this.customCloudProviderParsedData[key]]
        }
        return [key, this.customCloudProviderData[key]]
      }))
      return data
    },
  },
  methods: {
    async onInputTextarea (key, type) {
      set(this.customCloudProviderParsedData, key, {})
      try {
        if (type === 'yaml') {
          this.customCloudProviderParsedData[key] = await this.yaml.load(this.customCloudProviderData[key])
        } else if (type === 'json') {
          this.customCloudProviderParsedData[key] = JSON.parse(this.customCloudProviderData[key])
        }
      } catch (err) {
        /* ignore errors */
      } finally {
        if (!isObject(this.customCloudProviderParsedData[key])) {
          this.customCloudProviderParsedData[key] = {}
        }
      }
      this.v$.customCloudProviderData[key].$touch()
    },
    reset () {
      this.v$.$reset()

      this.customCloudProviderParsedData = {}
      this.customCloudProviderData = {}
      this.showSecrets = {}

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'textAreaData')
      }
    },
    toggleShowSecrets (key) {
      set(this.showSecrets, key, !this.showSecrets[key])
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>

.markdown {
  :deep(p) {
    margin: 0px;
  }
}

</style>
