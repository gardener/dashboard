<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-start">
    <g-status-tag
      v-for="condition in conditions"
      :key="condition.type"
      :condition="condition"
      :popper-placement="popperPlacement"
      :secret-binding-name="shootSecretBindingName"
      :namespace="shootNamespace"
      :stale-shoot="isStaleShoot"
    />
  </div>
  <template v-if="showStatusText">
    <div
      v-for="({ description, link }) in errorCodeObjects"
      :key="description"
      class="mt-1"
    >
      <div class="font-weight-bold text-error wrap-text">
        {{ description }}
      </div>
      <div v-if="link">
        <g-external-link
          :url="link.url"
          class="font-weight-bold text-error"
        >
          {{ link.text }}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script>
import { mapActions } from 'pinia'
import { useConfigStore } from '@/store/config'
import { shootItem } from '@/mixins/shootItem'

import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'

import sortBy from 'lodash/sortBy'

export default {
  components: {
    GStatusTag,
    GExternalLink,
  },
  mixins: [shootItem],
  props: {
    popperPlacement: {
      type: String,
    },
    showStatusText: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    conditions () {
      const conditions = this.shootReadiness
        .filter(condition => !!condition.lastTransitionTime)
        .map(condition => {
          const conditiondDefaults = this.conditionForType(condition.type)
          return {
            ...conditiondDefaults,
            ...condition,
          }
        })
      return sortBy(conditions, 'sortOrder')
    },
    errorCodeObjects () {
      const allErrorCodes = errorCodesFromArray(this.conditions)
      return objectsFromErrorCodes(allErrorCodes)
    },
  },
  methods: {
    ...mapActions(useConfigStore, [
      'conditionForType',
    ]),
  },
}
</script>
