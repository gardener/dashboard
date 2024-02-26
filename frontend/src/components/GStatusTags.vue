<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-collapsable-items
    :items="conditions"
    :uid="shootMetadata.uid"
    inject-key="expandedConditions"
    :collapse="collapse"
    no-wrap
  >
    <template #collapsed>
      <v-tooltip location="top">
        <template #activator="{ props }">
          <v-chip
            :color="collapsedChipColor"
            :variant="errorCount > 0 ? 'flat' : 'tonal'"
            size="small"
            v-bind="props"
          >
            {{ collapsedChipText }}
          </v-chip>
        </template>
        {{ tooltipText }}
      </v-tooltip>
    </template>
    <template #item="{ item }">
      <g-status-tag
        :key="item.type"
        :condition="item"
        :popper-placement="popperPlacement"
        :secret-binding-name="shootSecretBindingName"
        :shoot-metadata="shootMetadata"
        :stale-shoot="isStaleShoot"
      />
    </template>
  </g-collapsable-items>
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

import GStatusTag from '@/components/GStatusTag.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GCollapsableItems from '@/components/GCollapsableItems'

import { shootItem } from '@/mixins/shootItem'
import {
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import {
  sortBy,
  filter,
  isEmpty,
} from '@/lodash'

export default {
  components: {
    GStatusTag,
    GExternalLink,
    GCollapsableItems,
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
    collapse: {
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
    errorCount () {
      return filter(this.conditions, condition => condition.status === 'False' || !isEmpty(condition.codes)).length
    },
    unknownCount () {
      return filter(this.conditions, ['status', 'Unknown']).length
    },
    progressingCount () {
      return filter(this.conditions, ['status', 'Progressing']).length
    },
    tooltipText () {
      const texts = []
      if (this.errorCount > 0) {
        texts.push(`${this.errorCount} Error`)
      }
      if (this.unknownCount > 0) {
        texts.push(`${this.unknownCount} Unknown`)
      }
      if (this.progressingCount > 0) {
        texts.push(`${this.progressingCount} Progressing`)
      }
      const okCount = this.conditions.length - this.errorCount - this.unknownCount - this.progressingCount
      if (okCount > 0) {
        texts.push(`${okCount} OK`)
      }

      return texts.join(', ')
    },
    collapsedChipColor () {
      if (this.errorCount > 0) {
        return 'error'
      }
      if (this.unknownCount > 0) {
        return 'grey'
      }
      if (this.progressingCount > 0) {
        return 'info'
      }
      return 'primary'
    },
    collapsedChipText () {
      if (this.errorCount > 0) {
        return `${this.errorCount}/${this.conditions.length} Error`
      }
      if (this.unknownCount > 0) {
        return `${this.unknownCount}/${this.conditions.length} Unknown`
      }
      if (this.progressingCount > 0) {
        return `${this.progressingCount}/${this.conditions.length} Progressing`
      }
      return `${this.conditions.length}/${this.conditions.length} OK`
    },
  },
  methods: {
    ...mapActions(useConfigStore, [
      'conditionForType',
    ]),
  },
}
</script>
