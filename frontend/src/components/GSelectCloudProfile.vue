<!--
SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    v-model="selectedValue"
    v-messages-color="{ color: 'warning' }"
    :items="selectItems"
    label="Cloud Profile"
    item-color="primary"
    :error-messages="getErrorMessages(v$.selectedValue)"
    :item-title="title"
    variant="underlined"
    :hint="hint"
    persistent-hint
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

import { useCloudProfileStore } from '@/store/cloudProfile/index'
import { useProjectStore } from '@/store/project.js'

import {
  getErrorMessages,
  cloudProfileDisplayName,
} from '@/utils'
import { withFieldName } from '@/utils/validators'

import find from 'lodash/find'

const props = defineProps({
  modelValue: { // cloudProfileRef
    type: Object,
    default: null,
  },
})

const { seedsByCloudProfileRef, cloudProfileList } = useCloudProfileStore()
const projectStore = useProjectStore()

const seeds = computed(() => {
  return seedsByCloudProfileRef(props.modelValue, projectStore.project)
})

const namespacedCloudProfiles = [] // ToDo: To be implemented: useNamespacedCloudProfileStore()

const emit = defineEmits([
  'update:modelValue',
])

const selectItems = computed(() => {
  const items = []

  if (namespacedCloudProfiles.length > 0) {
    items.push(
      ...namespacedCloudProfiles.map(profile => {
        const cloudProfileRef = {
          name: profile.metadata.name,
          kind: 'NamespacedCloudProfile',
        }
        return {
          value: cloudProfileRef,
          title: `${cloudProfileDisplayName(profile)} (Namespaced)`,
        }
      }),
    )
  }

  if (cloudProfileList.length > 0) {
    items.push(
      ...cloudProfileList.map(profile => {
        const cloudProfileRef = {
          name: profile.metadata.name,
          kind: 'CloudProfile',
        }
        return {
          value: cloudProfileRef,
          title: cloudProfileDisplayName(profile),
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

const selectedCloudProfile = computed(() => {
  if (props.modelValue?.kind === 'CloudProfile') {
    return find(cloudProfileList, { metadata: { name: props.modelValue?.name } })
  }
  if (props.modelValue?.kind === 'NamespacedCloudProfile') {
    return find(namespacedCloudProfiles, { metadata: { name: props.modelValue?.name } })
  }
  return undefined
})

const hint = computed(() => {
  if (selectedCloudProfile.value && !seeds.value.length) {
    return 'This cloud profile does not have a matching seed. Gardener will not be able to schedule shoots using this cloud profile'
  }
  return ''
})

const v$ = useVuelidate(rules, { selectedValue })
</script>
