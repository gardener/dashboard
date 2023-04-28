<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="d-flex flex-nowrap justify-start">
      <status-tag
        v-for="condition in conditions"
        :condition="condition"
        :popper-key="condition.type"
        :key="condition.type"
        :popper-placement="popperPlacement"
        :secret-binding-name="shootSecretBindingName"
        :namespace="shootNamespace"
        :stale-shoot="isStaleShoot">
    </status-tag>
    </div>
    <template v-if="showStatusText">
      <div v-for="({ description, link }) in errorCodeObjects" :key="description" class="mt-1">
        <div class="font-weight-bold text-error wrap-text">{{description}}</div>
        <div v-if="link"><external-link :url="link.url" class="font-weight-bold text-error">{{link.text}}</external-link></div>
      </div>
    </template>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import StatusTag from '@/components/StatusTag.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import sortBy from 'lodash/sortBy'
import { shootItem } from '@/mixins/shootItem'
import { objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'

export default {
  components: {
    StatusTag,
    ExternalLink
  },
  props: {
    popperPlacement: {
      type: String
    },
    showStatusText: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters('shoots', [
      'conditionForType'
    ]),
    conditions () {
      return sortBy(this.shootReadiness
        .filter(condition => !!condition.lastTransitionTime)
        .map(condition => ({
          ...this.conditionForType(condition.type),
          ...condition
        })), 'sortOrder')
    },
    errorCodeObjects () {
      const allErrorCodes = errorCodesFromArray(this.conditions)
      return objectsFromErrorCodes(allErrorCodes)
    }
  }
}
</script>
