<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row v-if="costObjectsSettingEnabled">
    <v-col cols="6">
      <v-select
        v-model="v$.costObjectType.$model"
        variant="underlined"
        :items="costObjectTypes"
        label="Cost Object Type"
        required
        :error-messages="getErrorMessages(v$.costObjectType)"
      />
    </v-col>
    <v-col cols="6">
      <v-text-field
        v-model="v$.costObject.$model"
        variant="underlined"
        color="primary"
        label="Cost Object"
        :error-messages="getErrorMessages(v$.costObject)"
      />
    </v-col>
    <v-col
      v-if="!!costObjectDescriptionHtml"
      cols="12"
    >
      <v-alert
        density="compact"
        type="info"
        variant="tonal"
        color="primary"
      >
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="alert-banner-message"
          v-html="costObjectDescriptionHtml"
        />
        <!-- eslint-enable vue/no-v-html -->
      </v-alert>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  helpers,
  requiredIf,
} from '@vuelidate/validators'

import { useProjectContext } from '@/composables/useProjectContext'
import { useProjectCostObject } from '@/composables/useProjectCostObject'

import { withMessage } from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import { head } from '@/lodash'

const {
  projectManifest,
  costObject,
  costObjectType,
} = useProjectContext()

const {
  costObjectsSettingEnabled,
  costObjectTypes,
  costObjectDescriptionHtml,
  costObjectRegex,
  costObjectErrorMessage,
} = useProjectCostObject(projectManifest)

if (!costObjectType.value) {
  costObjectType.value = head(costObjectTypes.value)?.value
}

const isValidCostObject = computed(() => {
  return withMessage(
    costObjectErrorMessage.value,
    helpers.withParams(
      { type: 'regex', pattern: costObjectRegex.value },
      helpers.regex(costObjectRegex.value),
    ),
  )
})

const rules = {
  costObject: {
    isValidCostObject,
  },
  costObjectType: {
    requiredIf: requiredIf(() => !!costObject.value),
  },
}

const v$ = useVuelidate(rules, { costObject, costObjectType })

</script>
