<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    v-model="selectedValue"
    :items="selectItems"
    label="Cloud Profile"
    item-color="primary"
    :error-messages="getErrorMessages(v$.selectedValue)"
    :item-title="title"
    variant="underlined"
    @blur="v$.selectedValue.$touch()"
  />
</template>

<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

const props = defineProps({
  modelValue: { // cloudProfileRef
    type: Object,
    default: null,
  },
  cloudProfiles: {
    type: Array,
    required: true,
  },
  namespacedCloudProfiles: {
    type: Array,
    required: false,
    default: () => [],
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const selectItems = computed(() => {
  const items = []

  if (props.namespacedCloudProfiles.length > 0) {
    items.push(
      ...props.namespacedCloudProfiles.map(profile => {
        const cloudProfileRef = {
          name: profile.metadata.name,
          kind: 'NamespacedCloudProfile',
        }
        return {
          value: cloudProfileRef,
          title: `${profile.metadata.displayName} (Namespaced)`,
        }
      }),
    )
  }

  if (props.cloudProfiles.length > 0) {
    items.push(
      ...props.cloudProfiles.map(profile => {
        const cloudProfileRef = {
          name: profile.metadata.name,
          kind: 'CloudProfile',
        }
        return {
          value: cloudProfileRef,
          title: profile.metadata.displayName,
        }
      }),
    )
  }

  return items
})

const selectedValue = ref(null)

watch(() => props.modelValue, newValue => {
  selectedValue.value = newValue
}, { deep: true, immediate: true })

watch(selectedValue, newValue => {
  emit('update:modelValue', newValue)
})

function title (item) {
  if (item.title) {
    return item.title
  }
  // Fallback for case when selected item is not in any of the lists
  return `${item?.name} (${item?.kind})`
}

const rules = {
  selectedValue: withFieldName('Cloud Profile', {
    required,
  }),
}
const v$ = useVuelidate(rules, { selectedValue })
</script>
