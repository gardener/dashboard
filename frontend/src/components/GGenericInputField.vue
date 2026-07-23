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
    :type="textFieldType"
    :autocomplete="inputAutocomplete"
    :append-icon="appendIcon"
    :error-messages="inputErrorMessages"
    variant="underlined"
    v-bind="inputProps"
    @click:append="toggleSecretVisibility"
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
    :class="{ 'hide-secret': hideStructuredSecret }"
    variant="filled"
    v-bind="inputProps"
    @click:append="toggleSecretVisibility"
    @blur="v$.localValue.$touch()"
  />
</template>

<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  maxLength,
  minLength,
  required,
  url,
} from '@vuelidate/validators'

import { useLogger } from '@/composables/useLogger'
import { useStructuredTextField } from '@/composables/useStructuredTextField'

import {
  alphaNumUnderscore,
  base64,
  guid,
  withFieldName,
  withMessage,
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
import has from 'lodash/has'
import isEmpty from 'lodash/isEmpty'
import set from 'lodash/set'

const props = defineProps({
  field: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: [String, Object, Array, Number, Boolean],
  },
  inputProps: {
    type: Object,
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const fieldRef = useTemplateRef('fieldRef')
const logger = useLogger()
const dropErrorMessage = ref()

const fieldType = computed(() => props.field.type)
const isYaml = computed(() => isYamlFieldType(fieldType.value))
const isJson = computed(() => isJsonFieldType(fieldType.value))
const isStructuredSecret = computed(() => isStructuredSecretFieldType(fieldType.value))
const isTextLike = computed(() => ['text', 'password'].includes(fieldType.value))
const isSelectLike = computed(() => ['select', 'select-multiple'].includes(fieldType.value))
const isStructuredLike = computed(() => isStructuredFieldType(fieldType.value))

const inputAutocomplete = computed(() => {
  if (props.field.autocomplete) {
    return props.field.autocomplete
  }
  return isSecretFieldType(fieldType.value)
    ? 'off'
    : undefined
})

const showSecret = ref(false)

const appendIcon = computed(() => {
  if (!isSecretFieldType(fieldType.value)) {
    return undefined
  }
  return showSecret.value
    ? 'mdi-eye-off'
    : 'mdi-eye'
})

const textFieldType = computed(() => {
  if (fieldType.value !== 'password') {
    return 'text'
  }
  return showSecret.value
    ? 'text'
    : 'password'
})

const hideStructuredSecret = computed(() => {
  return isStructuredSecret.value && !showSecret.value
})

function toggleSecretVisibility () {
  if (isSecretFieldType(fieldType.value)) {
    showSecret.value = !showSecret.value
  }
}

const {
  rawText,
  setRawTextWithValue,
  parseRawTextToObject,
} = useStructuredTextField(fieldType)

let suppressParentSync = false

function emitStructuredValue (value) {
  suppressParentSync = true
  emit('update:modelValue', value)
  nextTick(() => {
    suppressParentSync = false
  })
}

const structuredRawText = computed({
  get: () => rawText.value,
  set: value => {
    rawText.value = value
    const parsed = parseRawTextToObject()
    emitStructuredValue(parsed === undefined ? value : parsed)
  },
})

const localValue = computed({
  get: () => {
    return isStructuredLike.value
      ? structuredRawText.value
      : props.modelValue
  },
  set: value => {
    dropErrorMessage.value = undefined
    if (isStructuredLike.value) {
      structuredRawText.value = value
    } else {
      emit('update:modelValue', value)
    }
  },
})

watch(
  () => props.modelValue,
  value => {
    if (isStructuredLike.value && !suppressParentSync) {
      setRawTextWithValue(value)
    }
  },
  { immediate: true },
)

function matchesPattern (value, pattern) {
  const expression = pattern instanceof RegExp
    ? pattern
    : new RegExp(pattern) // eslint-disable-line security/detect-non-literal-regexp
  expression.lastIndex = 0
  return expression.test(value)
}

function objectValue () {
  if (!isStructuredLike.value) {
    return props.modelValue
  }
  return parseRawTextToObject()
}

function compileValidator (validator) {
  switch (validator.type) {
    case 'required':
      return required
    case 'regex':
      return value => !value || matchesPattern(value, validator.pattern)
    case 'guid':
      return guid
    case 'alphaNumUnderscore':
      return alphaNumUnderscore
    case 'base64':
      return base64
    case 'url':
      return url
    case 'maxLength':
      return maxLength(validator.length)
    case 'minLength':
      return minLength(validator.length)
    case 'isValidObject':
      return value => {
        if (isEmpty(value)) {
          return true
        }
        const parsed = parseRawTextToObject()
        return parsed !== undefined && parsed !== null && Object.keys(parsed).length > 0
      }
    case 'hasObjectProp':
      return () => {
        const object = objectValue()
        if (!has(object, validator.key)) {
          return false
        }
        const value = get(object, validator.key)
        if (Object.prototype.hasOwnProperty.call(validator, 'value')) {
          return value === validator.value
        }
        if (value === undefined || value === null || value === '') {
          return false
        }
        if (validator.pattern) {
          return matchesPattern(value, validator.pattern)
        }
        return true
      }
    default:
      return undefined
  }
}

function defaultValidatorMessage (validator) {
  if (validator.type === 'isValidObject') {
    if (isYaml.value) {
      return 'You need to enter secret data as YAML key-value pairs'
    }
    if (isJson.value) {
      return 'You need to enter secret data as valid JSON object'
    }
  }

  if (validator.type === 'hasObjectProp') {
    if (Object.prototype.hasOwnProperty.call(validator, 'value')) {
      return `Must contain a valid ${validator.key} property with value "${validator.value}"`
    }
    if (validator.pattern) {
      return `Must contain a valid ${validator.key} property matching pattern ${validator.pattern}`
    }
  }

  return undefined
}

const rules = computed(() => {
  const compiledValidators = {}

  for (const [validatorName, validator] of Object.entries(props.field.validators ?? {})) {
    let compiledValidator = compileValidator(validator)
    if (!compiledValidator) {
      logger.warn(`Ignoring unsupported validator type '${validator.type}' for field '${props.field.key}'`)
      continue
    }

    const message = validator.message ?? defaultValidatorMessage(validator)
    if (message) {
      compiledValidator = withMessage(message, compiledValidator)
    }
    set(compiledValidators, [validatorName], compiledValidator)
  }

  return {
    localValue: withFieldName(props.field.label, compiledValidators),
  }
})

const v$ = useVuelidate(rules, { localValue })

const inputErrorMessages = computed(() => [
  ...(dropErrorMessage.value ? [dropErrorMessage.value] : []),
  ...getErrorMessages(v$.value.localValue),
])

const items = computed(() => {
  return Array.isArray(props.field.values)
    ? props.field.values
    : undefined
})

const dropFileValidation = computed(() => {
  if (isYaml.value) {
    return {
      acceptedFileDescription: 'a YAML file (.yaml or .yml)',
      acceptedFileExtensions: ['.yaml', '.yml'],
      pattern: /yaml|yml/,
    }
  }

  return {
    acceptedFileDescription: 'a JSON file (.json)',
    acceptedFileExtensions: ['.json'],
    pattern: /json/,
  }
})

let disposeTextFieldDrop

onMounted(() => {
  if (!isStructuredLike.value) {
    return
  }

  const {
    acceptedFileDescription,
    acceptedFileExtensions,
    pattern,
  } = dropFileValidation.value

  disposeTextFieldDrop = handleTextFieldDrop(fieldRef.value, pattern, value => {
    localValue.value = value
    v$.value.localValue.$touch()
  }, {
    acceptedFileDescription,
    acceptedFileExtensions,
    onReject: ({ message }) => {
      dropErrorMessage.value = message
      v$.value.localValue.$touch()
    },
  })
})

onUnmounted(() => {
  disposeTextFieldDrop?.()
})
</script>

<style lang="scss" scoped>

:deep(.v-textarea textarea) {
  font-family: monospace;
  font-size: 14px;
}

.hide-secret {
  :deep(.v-input__control textarea) {
    -webkit-text-security: disc;
  }
}

</style>
