<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-text-field
    v-if="isTextLike"
    ref="fieldRef"
    v-model="v$.localValue.$model"
    color="primary"
    :label="field.label"
    :hint="field.hint"
    :type="computedTextFieldType"
    :autocomplete="inputAutocomplete"
    :append-icon="appendIcon"
    :error-messages="inputErrorMessages"
    variant="underlined"
    v-bind="inputProps"
    @click:append="onClickAppend"
    @blur="v$.localValue.$touch()"
  />

  <v-select
    v-else-if="isSelectLike"
    ref="fieldRef"
    v-model="v$.localValue.$model"
    color="primary"
    item-color="primary"
    :label="field.label"
    :items="items"
    :hint="field.hint"
    :multiple="field.type === 'select-multiple'"
    :error-messages="inputErrorMessages"
    variant="underlined"
    v-bind="inputProps"
    @blur="v$.localValue.$touch()"
  />

  <v-textarea
    v-else-if="isStructuredLike"
    ref="fieldRef"
    v-model="v$.localValue.$model"
    color="primary"
    :label="field.label"
    :hint="field.hint"
    :error-messages="inputErrorMessages"
    :autocomplete="inputAutocomplete"
    :append-icon="appendIcon"
    :class="{ 'hide-secret': hideSecret }"
    variant="filled"
    v-bind="inputProps"
    @click:append="onClickAppend"
    @blur="v$.localValue.$touch()"
  />
</template>

<script setup>
import {
  computed,
  ref,
  watch,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from 'vue'
import {
  required,
  maxLength,
  minLength,
  url,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useStructuredTextField } from '@/composables/useStructuredTextField'
import { useLogger } from '@/composables/useLogger'

import {
  withFieldName,
  withMessage,
  guid,
  alphaNumUnderscore,
  base64,
} from '@/utils/validators'
import {
  getErrorMessages,
  handleTextFieldDrop,
} from '@/utils'
import {
  isJsonFieldType,
  isSecretFieldType,
  isStructuredFieldType,
  isStructuredSecretFieldType,
  isYamlFieldType,
} from '@/utils/inputFieldTypes'

import get from 'lodash/get'
import forEach from 'lodash/forEach'
import set from 'lodash/set'
import isEmpty from 'lodash/isEmpty'

const props = defineProps({
  field: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [String, Object, Number, Boolean],
  },
  inputProps: {
    type: Object,
    default: undefined,
  },
  cloudProfileRef: {
    type: Object,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'touch',
])

const fieldRef = useTemplateRef('fieldRef')
const logger = useLogger()
const dropErrorMessage = ref()

const fieldType = computed(() => props.field.type)

const isYAML = computed(() => isYamlFieldType(fieldType.value))
const isJSON = computed(() => isJsonFieldType(fieldType.value))
const isStructuredPassword = computed(() => isStructuredSecretFieldType(fieldType.value))

const isTextLike = computed(() => fieldType.value === 'text' || fieldType.value === 'password')
const isSelectLike = computed(() => fieldType.value === 'select' || fieldType.value === 'select-multiple')
const isStructuredLike = computed(() => isStructuredFieldType(fieldType.value))

const inputAutocomplete = computed(() => {
  if (props.field.autocomplete) {
    return props.field.autocomplete
  }

  if (isSecretFieldType(fieldType.value)) {
    return 'off'
  }

  return undefined
})

// ----- password eye handling -----
const showPassword = ref(false)

const appendIcon = computed(() => {
  if (!isSecretFieldType(fieldType.value)) {
    return undefined
  }
  return showPassword.value ? 'mdi-eye' : 'mdi-eye-off'
})

const computedTextFieldType = computed(() => {
  if (fieldType.value !== 'password') {
    return 'text'
  }
  return showPassword.value ? 'text' : 'password'
})

const hideSecret = computed(() => {
  return isStructuredPassword.value && !showPassword.value
})

function onClickAppend () {
  if (isSecretFieldType(fieldType.value)) {
    showPassword.value = !showPassword.value
  }
}

// ----- normal fields (text/select) -----
const localValue = computed({
  get: () => {
    if (isStructuredLike.value) {
      return structuredRawText.value
    }
    return props.modelValue
  },
  set: value => {
    dropErrorMessage.value = undefined
    if (isStructuredLike.value) {
      structuredRawText.value = value
      v$.value.localValue.$touch()
      return
    }
    emit('update:modelValue', value)
  },
})

// ----- structured fields (yaml/json) -----
let touched = false

const {
  rawText,
  setRawTextWithValue,
  parseRawTextToObject,
} = useStructuredTextField(computed(() => props.field.type))

const structuredRawText = computed({
  get: () => rawText.value,
  set: value => {
    touched = true
    rawText.value = value

    const parsed = parseRawTextToObject()
    emit('update:modelValue', parsed === undefined ? value : parsed)
  },
})

// keep raw string in sync when parent updates parsed object (e.g. initial load / reset)
watch(
  () => props.modelValue,
  value => {
    if (isStructuredLike.value && !touched) {
      setRawTextWithValue(value)
    }
  },
  { immediate: true },
)

// ----- validation (yaml/json) -----
const rules = computed(() => {
  const compiledValidators = {}
  forEach(props.field.validators, (validator, validatorName) => {
    let message = validator.message

    switch (validator.type) {
      case 'required':
        set(compiledValidators, [validatorName], required)
        break
      case 'regex':
        set(compiledValidators, [validatorName], value => !value || new RegExp(validator.pattern).test(value)) // eslint-disable-line security/detect-non-literal-regexp
        break
      case 'guid':
        set(compiledValidators, [validatorName], guid)
        break
      case 'alphaNumUnderscore':
        set(compiledValidators, [validatorName], alphaNumUnderscore)
        break
      case 'base64':
        set(compiledValidators, [validatorName], base64)
        break
      case 'url':
        set(compiledValidators, [validatorName], url)
        break
      case 'maxLength':
        set(compiledValidators, [validatorName], maxLength(validator.length))
        break
      case 'minLength':
        set(compiledValidators, [validatorName], minLength(validator.length))
        break
      // structured content validators
      case 'isValidObject':
        set(compiledValidators, [validatorName], value => {
          if (isEmpty(value)) {
            return true // empty is valid (unless required validator is also present)
          }
          // Check if modelValue is a non-empty object (successful parse)
          return typeof props.modelValue === 'object' && props.modelValue !== null && Object.keys(props.modelValue).length > 0
        })
        if (!message) {
          if (isYAML.value) {
            message = 'You need to enter secret data as YAML key-value pairs'
          } else if (isJSON.value) {
            message = 'You need to enter secret data as valid JSON object'
          }
        }
        break
      case 'hasObjectProp':
        set(compiledValidators, [validatorName], () => {
          const objVal = get(props.modelValue, [validator.key])
          if (!objVal) {
            return false
          }
          if (validator.value) {
            return objVal === validator.value
          }
          if (validator.pattern) {
            return validator.pattern.test(objVal)
          }
          return true
        })
        if (!message) {
          if (validator.value) {
            message = `Must contain a valid ${validator.key} property with value "${validator.value}"`
          } else if (validator.pattern) {
            message = `Must contain a valid ${validator.key} property matching pattern ${validator.pattern}`
          }
        }
        break
      default:
        logger.warn(`Ignoring unsupported validator type '${validator.type}' for field '${props.field.key}'`)
        break
    }
    const compiledValidator = get(compiledValidators, [validatorName])
    if (message && compiledValidator) {
      set(compiledValidators, [validatorName], withMessage(message, compiledValidator))
    }
  })
  return {
    localValue: withFieldName(props.field.label, compiledValidators),
  }
})

const v$ = useVuelidate(rules, { localValue })

const inputErrorMessages = computed(() => {
  return [
    ...(dropErrorMessage.value ? [dropErrorMessage.value] : []),
    ...getErrorMessages(v$.value.localValue),
  ]
})

const items = computed(() => {
  const field = props.field
  let items
  if (Array.isArray(field.values)) {
    items = field.values
  }
  return items
})

// ----- handle file drop -----
const dropFileValidation = computed(() => {
  if (isYAML.value) {
    return {
      acceptedFileDescription: 'a YAML file (.yaml or .yml)',
      acceptedFileExtensions: ['.yaml', '.yml'],
      pattern: /yaml|yml/,
    }
  }

  if (isJSON.value) {
    return {
      acceptedFileDescription: 'a JSON file (.json)',
      acceptedFileExtensions: ['.json'],
      pattern: /json/,
    }
  }

  return {
    acceptedFileDescription: 'a text file',
    acceptedFileExtensions: [],
    pattern: /.*/,
  }
})

let disposeTextFieldDrop

onMounted(() => {
  if (isStructuredLike.value) {
    const {
      acceptedFileDescription,
      acceptedFileExtensions,
      pattern,
    } = dropFileValidation.value
    disposeTextFieldDrop = handleTextFieldDrop(fieldRef.value, pattern, value => {
      localValue.value = value
    }, {
      acceptedFileDescription,
      acceptedFileExtensions,
      onReject: ({ message }) => {
        dropErrorMessage.value = message
        v$.value.localValue.$touch()
      },
    })
  }
})

onUnmounted(() => {
  disposeTextFieldDrop?.()
})

</script>

<style lang="scss" scoped>

  .hide-secret {
    :deep(.v-input__control textarea) {
      -webkit-text-security: disc;
    }
  }

</style>
