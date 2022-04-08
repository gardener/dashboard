<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-center">
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
</template>

<script>
import StatusTag from '@/components/StatusTag'
import filter from 'lodash/filter'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    StatusTag
  },
  props: {
    popperPlacement: {
      type: String
    }
  },
  mixins: [shootItem],
  computed: {
    filteredConditions () {
      return filter(this.shootReadiness, condition => !!condition.lastTransitionTime)
    }
  }
}
</script>
