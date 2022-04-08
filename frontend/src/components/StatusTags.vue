<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="d-flex flex-nowrap justify-start">
      <status-tag
        v-for="condition in filteredConditions"
        :condition="condition"
        :popper-key="condition.type"
        :key="condition.type"
        :popper-placement="popperPlacement"
        :secret-binding-name="shootSecretBindingName"
        :namespace="shootNamespace">
      </status-tag>
    </div>
    <template v-if="showStatusText">
      <div v-for="({ description }) in errorCodeObjects" :key="description" class="mt-1">
        <div class="font-weight-bold error--text wrap" v-html="description" />
      </div>
    </template>
  </div>
</template>

<script>
import StatusTag from '@/components/StatusTag'
import filter from 'lodash/filter'
import { shootItem } from '@/mixins/shootItem'
import { objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'

export default {
  components: {
    StatusTag
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
    filteredConditions () {
      return filter(this.shootReadiness, condition => !!condition.lastTransitionTime)
    },
    errorCodeObjects () {
      const allErrorCodes = errorCodesFromArray(this.filteredConditions)
      return objectsFromErrorCodes(allErrorCodes)
    }
  }
}
</script>

<style lang="scss" scoped>

  .wrap {
    white-space: normal;
  }

</style>
