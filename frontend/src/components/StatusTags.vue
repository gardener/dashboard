<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap justify-center">
    <status-tag
      v-for="condition in conditions"
      :condition="condition"
      :popper-key="condition.id"
      :key="condition.id"
      :popper-placement="popperPlacement"
      :secret-binding-name="shootSecretBindingName"
      :namespace="shootNamespace">
    </status-tag>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import join from 'lodash/join'
import map from 'lodash/map'
import split from 'lodash/split'
import dropRight from 'lodash/dropRight'
import last from 'lodash/last'
import first from 'lodash/first'
import snakeCase from 'lodash/snakeCase'
import includes from 'lodash/includes'
import upperFirst from 'lodash/upperFirst'
import StatusTag from '@/components/StatusTag'
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'
import sortBy from 'lodash/sortBy'
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
    ...mapState([
      'conditionCache'
    ]),
    conditions () {
      if (isEmpty(this.shootConditions)) {
        return []
      }

      const shootConditions = filter(this.shootConditions, condition => !!condition.lastTransitionTime)
      const conditions = map(shootConditions, condition => {
        const { lastTransitionTime, message, status, type, codes } = condition
        const id = type
        const { displayName: name, shortName, description, showAdminOnly } = this.getCondition(condition.type)

        return { id, name, shortName, description, message, lastTransitionTime, status, codes, showAdminOnly }
      })

      return sortBy(conditions, 'shortName')
    }
  },
  methods: {
    ...mapMutations([
      'setCondition'
    ]),
    getCondition (type) {
      const condition = this.conditionCache[type]
      if (condition) {
        return condition
      }

      const dropSuffixes = [
        'Available',
        'Healthy',
        'Ready',
        'Availability'
      ]
      let conditionComponents = snakeCase(type)
      conditionComponents = split(conditionComponents, '_')
      conditionComponents = map(conditionComponents, upperFirst)
      if (includes(dropSuffixes, last(conditionComponents))) {
        conditionComponents = dropRight(conditionComponents)
      }

      const displayName = join(conditionComponents, ' ')
      const shortName = join(map(conditionComponents, first), '')
      const conditionMetaData = { displayName, shortName }
      this.setCondition({ conditionKey: type, conditionValue: conditionMetaData })

      return conditionMetaData
    }
  }
}
</script>
