<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

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

const credentialName = computed(() =>
  bindingCredentialName(binding.value),
)

const credentialKind = computed(() =>
  bindingCredentialKind(binding.value),
)

</script>
