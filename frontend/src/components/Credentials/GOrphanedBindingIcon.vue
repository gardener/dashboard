<!--
SPDX-FileCopyrightText: Copyright Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<!--
SPDX-FileCopyrightText: Copyright Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip location="top">
    <template #activator="{ props: activatorProps }">
      <v-icon
        v-bind="activatorProps"
        icon="mdi-alert-circle-outline"
        end
        size="small"
        color="warning"
      />
    </template>
    Associated <code>{{ credentialKind }}</code> with name {{ credentialName }} does not exist
  </v-tooltip>
</template>

<script setup>
import {
  toRef,
  computed,
} from 'vue'

import {
  bindingCredentialName,
  bindingCredentialKind,
} from '@/composables/credential/helper'

const props = defineProps({
  binding: Object,
})

const binding = toRef(props, 'binding')

const credentialName = computed(() => {
  return bindingCredentialName(binding.value)
})

const credentialKind = computed(() => {
  return bindingCredentialKind(binding.value)
})

</script>
