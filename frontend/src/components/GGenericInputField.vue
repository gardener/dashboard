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
    :append-icon="appendIcon"
    :error-messages="getErrorMessages(v$.localValue)"
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
    :error-messages="getErrorMessages(v$.localValue)"
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
    :error-messages="getErrorMessages(v$.localValue)"
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
  useTemplateRef,
} from 'vue'
import {
  required,
  maxLength,
  minLength,
  url,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useCloudProfileStore } from '@/store/cloudProfile'

import { useStructuredTextField } from '@/composables/useStructuredTextField'

import {
  withFieldName,
  withMessage,
  guid,
} from '@/utils/validators'
import {
  getErrorMessages,
  handleTextFieldDrop,
} from '@/utils'

import get from 'lodash/get'
import map from 'lodash/map'
import forEach from 'lodash/forEach'
import set from 'lodash/set'
import isEmpty from 'lodash/isEmpty'

const cloudProfileStore = useCloudProfileStore()

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
  errorMessages: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'update:modelValue',
  'touch',
])

const fieldRef = useTemplateRef('fieldRef')

const isYAML = computed(() => props.field.type === 'yaml' || props.field.type === 'yaml-secret')
const isJSON = computed(() => props.field.type === 'json' || props.field.type === 'json-secret')
const isStructuredPassword = computed(() => props.field.type === 'yaml-secret' || props.field.type === 'json-secret')

const isTextLike = computed(() => props.field.type === 'text' || props.field.type === 'password')
const isSelectLike = computed(() => props.field.type === 'select' || props.field.type === 'select-multiple')
const isStructuredLike = computed(() => isYAML.value || isJSON.value)

// ----- password eye handling -----
const showPassword = ref(false)

const appendIcon = computed(() => {
  if (props.field.type !== 'password' && !isStructuredPassword.value) {
    return undefined
  }
  return showPassword.value ? 'mdi-eye' : 'mdi-eye-off'
})

const computedTextFieldType = computed(() => {
  if (props.field.type !== 'password') {
    return 'text'
  }
  return showPassword.value ? 'text' : 'password'
})

const hideSecret = computed(() => {
  return isStructuredPassword.value && !showPassword.value
})

function onClickAppend () {
  if (props.field.type === 'password' || isStructuredPassword.value) {
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
  setRawTextWithObject,
  parseRawTextToObject,
} = useStructuredTextField(computed(() => props.field.type))

const structuredRawText = computed({
  get: () => rawText.value,
  set: value => {
    touched = true
    rawText.value = value

    const parsed = parseRawTextToObject()
    if (parsed !== undefined) {
      emit('update:modelValue', parsed)
    }
  },
})

// keep raw string in sync when parent updates parsed object (e.g. initial load / reset)
watch(
  () => props.modelValue,
  value => {
    if (isStructuredLike.value && !touched) {
      setRawTextWithObject(value)
    }
  },
  { immediate: true },
)

// ----- validation (yaml/json) -----
const rules = computed(() => {
  const compiledValidators = {}
  forEach(props.field.validators, (validator, validatorName) => {
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
      case 'isValidObject': // TODO need to fix invalid yaml => always update modelValue also on yaml error?
        set(compiledValidators, [validatorName], value => isEmpty(value) || Object.keys(props.modelValue).length > 0)
        if (!validator.message) {
          if (isYAML.value) {
            validator.message = 'You need to enter secret data as YAML key-value pairs'
          } else if (isJSON.value) {
            validator.message = 'You need to enter secret data as valid JSON object'
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
        if (!validator.message) {
          if (validator.value) {
            validator.message = `Must contain a valid ${validator.key} property with value "${validator.value}"`
          } else if (validator.pattern) {
            validator.message = `Must contain a valid ${validator.key} property matching pattern ${validator.pattern}`
          }
        }
        break
    }
    if (validator.message) {
      set(compiledValidators, [validatorName], withMessage(validator.message, get(compiledValidators, [validatorName])))
    }
  })
  return {
    localValue: withFieldName(props.field.label, compiledValidators),
  }
})

const v$ = useVuelidate(rules, { localValue })

// TODO only required for custom fields => remove?
const items = computed(() => {
  const field = props.field
  let items
  if (Array.isArray(field.values)) {
    items = field.values
  } else if (field.values?.cloudprofilePath) {
    const cloudProfile = cloudProfileStore.cloudProfileByRef(props.cloudProfileRef)
    const values = get(cloudProfile, field.values.cloudprofilePath)
    items = map(values, field.values.key)
  }
  return items
})

// ----- handle file drop -----
onMounted(() => {
  if (isStructuredLike.value) {
    let pattern = /.*/
    if (isYAML.value) {
      pattern = /yaml/
    } else if (isJSON.value) {
      pattern = /json/
    }
    handleTextFieldDrop(fieldRef.value, pattern, value => {
      localValue.value = value
    })
  }
})

</script>

<style lang="scss" scoped>

  .hide-secret {
    :deep(.v-input__control textarea) {
      -webkit-text-security: disc;
    }
  }

</style>
