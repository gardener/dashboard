<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-start">
    <g-status-tag v-for="condition in conditions"
      :condition="condition"
      :key="condition.type"
      :popper-placement="popperPlacement"
      :secret-binding-name="shootSecretBindingName"
      :namespace="shootNamespace"
      :stale-shoot="isStaleShoot"
    />
  </div>
  <template v-if="showStatusText">
    <div v-for="({ description, link }) in errorCodeObjects" :key="description" class="mt-1">
      <div class="font-weight-bold text-error wrap-text">{{description}}</div>
      <div v-if="link">
        <g-external-link :url="link.url" class="font-weight-bold text-error">
          {{link.text}}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script>
import { mapActions } from 'pinia'
import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { shootItem } from '@/mixins/shootItem'

import { objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'

import sortBy from 'lodash/sortBy'
import { useShootStore } from '@/store'

export default {
  components: {
    GStatusTag,
    GExternalLink,
  },
  props: {
    popperPlacement: {
      type: String,
    },
    showStatusText: {
      type: Boolean,
      default: false,
    },
  },
  mixins: [shootItem],
  computed: {
    conditions () {
      return sortBy(this.shootReadiness
        .filter(condition => !!condition.lastTransitionTime)
        .map(condition => ({
          ...this.conditionForType(condition.type),
          ...condition,
        })), 'sortOrder')
    },
    errorCodeObjects () {
      const allErrorCodes = errorCodesFromArray(this.conditions)
      return objectsFromErrorCodes(allErrorCodes)
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'conditionForType',
    ]),
  },
}
</script>
