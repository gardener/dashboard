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
        <div class="font-weight-bold error--text wrap-text">{{description}}</div>
        <div v-if="link"><external-link :url="link.url" class="font-weight-bold error--text">{{link.text}}</external-link></div>
      </div>
    </template>
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
import ExternalLink from '@/components/ExternalLink'
import filter from 'lodash/filter'
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
    ...mapState([
      'conditionCache'
    ]),
    conditions () {
      const shootConditions = filter(this.shootReadiness, condition => !!condition.lastTransitionTime)
      const conditions = map(shootConditions, conditionStatus => {
        const condition = this.getCondition(conditionStatus.type)
        return { ...condition, ...conditionStatus }
      })

      return sortBy(conditions, 'weight')
    },
    errorCodeObjects () {
      const allErrorCodes = errorCodesFromArray(this.conditions)
      return objectsFromErrorCodes(allErrorCodes)
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

      const name = join(conditionComponents, ' ')
      const shortName = join(map(conditionComponents, first), '')
      const conditionMetaData = { name, shortName, weight: shortName }
      this.setCondition({ conditionKey: type, conditionValue: conditionMetaData })

      return conditionMetaData
    }
  }
}
</script>
