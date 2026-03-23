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
  >
    <template #item="{ item, props: itemProps }">
      <v-list-item
        v-bind="itemProps"
        :title="undefined"
      >
        <span>{{ item.raw.title }}</span>
        <v-chip
          v-if="item.raw.namespaced"
          size="x-small"
          color="primary"
          variant="tonal"
          class="ml-2"
        >
          Namespaced
        </v-chip>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <span>{{ item.raw.title }}</span>
      <v-chip
        v-if="item.raw.namespaced"
        size="x-small"
        color="primary"
        variant="tonal"
        class="ml-2"
      >
        Namespaced
      </v-chip>
    </template>
  </v-select>
</template>

<script setup>
import {
  computed,
  toRef,
  ref,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useCloudProfileStore } from '@/store/cloudProfile/index'
import { useProjectStore } from '@/store/project.js'
import { useSeedStore } from '@/store/seed'

import {
  getErrorMessages,
  cloudProfileDisplayName,
} from '@/utils'
import { withFieldName } from '@/utils/validators'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  cloudProfiles: {
    type: Array,
    required: true,
  },
})

const cloudProfileRef = toRef(props, 'modelValue')
const cloudProfiles = toRef(props, 'cloudProfiles')

const cloudProfileStore = useCloudProfileStore()
const projectStore = useProjectStore()
const { project } = storeToRefs(projectStore)
const seedStore = useSeedStore()

const seeds = computed(() => {
  const cloudProfile = cloudProfileStore.cloudProfileByRef(cloudProfileRef.value)
  return seedStore.seedsForCloudProfileByProject(cloudProfile, project.value)
})

const emit = defineEmits([
  'update:modelValue',
])

const selectItems = computed(() => {
  return cloudProfiles.value.map(profile => {
    const namespaced = profile.kind === 'NamespacedCloudProfile'
    const ref = {
      name: profile.metadata.name,
      kind: namespaced ? 'NamespacedCloudProfile' : 'CloudProfile',
    }
    if (namespaced && profile.metadata.namespace) {
      ref.namespace = profile.metadata.namespace
    }
    return {
      value: ref,
      title: cloudProfileDisplayName(profile),
      namespaced,
    }
  })
})

const selectedValue = ref(null)

watch(() => cloudProfileRef.value, newValue => {
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

const hint = computed(() => {
  const cloudProfile = cloudProfileStore.cloudProfileByRef(cloudProfileRef.value)
  if (cloudProfile && !seeds.value.length) {
    return 'This cloud profile does not have a matching seed. Gardener will not be able to schedule shoots using this cloud profile'
  }
  return ''
})

const v$ = useVuelidate(rules, { selectedValue })
</script>
