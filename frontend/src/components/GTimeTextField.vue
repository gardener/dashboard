<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-text-field
    v-model="timeValue"
    :error-messages="errorMessages"
    :hint="inputHint"
    :type="textFieldType"
    @input="v$.timeValue.$touch()"
  />
</template>

<script setup>

import { computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { useVModel } from '@vueuse/core'

import { withMessage } from '@/utils/validators'
import { getErrorMessages } from '@/utils'

const props = defineProps({
  modelValue: {
    type: String,
  },
  errorMessages: {
    type: Array,
  },
  hint: {
    type: String,
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const timeValue = useVModel(props, 'modelValue', emit)

const isSafari = computed(() => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
})

const textFieldType = computed(() => {
  /*
  Safari browser rendering of text fields with type 'time' is confusing
  See also https://bugs.webkit.org/show_bug.cgi?id=233215
  So we use type text for Safari and add hint & error handing to support user input
  */
  return isSafari.value ? 'text' : 'time'
})

const rules = {
  timeValue: {
    timeSyntax: withMessage('Input value is not valid 24-hour time format (HH:MM)',
      value => {
        return !value?.length || /^([01][0-9]|2[0-3]):([0-5][0-9])$/.test(value)
      }),
  },
}

const inputHint = computed(() => {
  if (isSafari.value) {
    const hint = 'Enter time in 24-hour format (HH:MM)'
    return props.hint ? `${props.hint} ${hint}` : hint
  }
  return props.hint
})

const errorMessages = computed(() => {
  return [
    ...props.errorMessages,
    ...getErrorMessages(v$.value.timeValue),
  ]
})

const v$ = useVuelidate(rules, { timeValue })

</script>
