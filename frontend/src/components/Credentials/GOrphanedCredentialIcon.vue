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
  credentialName as _credentialName,
  credentialKind as _credentialKind,
} from '@/composables/credential/helper'

const props = defineProps({
  credentialEntity: Object,
})

const credential = toRef(props, 'credentialEntity')

const credentialName = computed(() =>
  _credentialName(credential.value),
)

const credentialKind = computed(() =>
  _credentialKind(credential.value),
)

</script>
