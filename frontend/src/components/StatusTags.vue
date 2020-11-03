<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-center">
    <status-tag
      v-for="condition in filteredConditions"
      :condition="condition"
      :popper-key="condition.type"
      :key="condition.type"
      :popperPlacement="popperPlacement"
      :secretName="shootSecretBindingName"
      :namespace="shootNamespace">
    </status-tag>
  </div>
</template>

<script>
import StatusTag from '@/components/StatusTag'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    StatusTag
  },
  props: {
    shootItem: {
      type: Object
    },
    popperPlacement: {
      type: String
    }
  },
  mixins: [shootItem],
  computed: {
    filteredConditions () {
      if (isEmpty(this.shootConditions)) {
        return []
      }
      return filter(this.shootConditions, condition => !!condition.lastTransitionTime)
    }
  }
}
</script>
