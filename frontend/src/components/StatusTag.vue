<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div v-if="visible">
    <g-popper
      @input="onPopperInput"
      @rendered="popperRendered=true"
      :title="chipTitle"
      :toolbarColor="color"
      :time="{ caption: 'Last updated:', dateTime: tag.lastUpdateTime }"
      :popperKey="popperKeyWithType"
      :placement="popperPlacement"
      :disabled="!tag.message">
      <template v-slot:popperRef>
        <div>
          <v-tooltip top max-width="400px" :disabled="tooltipDisabled">
            <template v-slot:activator="{ on }">
              <v-chip
                v-on="on"
                class="status-tag"
                :class="{ 'cursor-pointer': tag.message }"
                outlined
                :text-color="color"
                small
                :color="color">
                {{chipText}}
              </v-chip>
            </template>
            <span class="font-weight-bold">{{chipTooltip.title}}</span>
            <div v-if="chipTooltip.description">
              {{chipTooltip.description}}
            </div>
          </v-tooltip>
        </div>
      </template>
      <ansi-text :text="tag.message"></ansi-text>
    </g-popper>
    <time-string
      v-if="popperRendered"
      v-show="false"
      :dateTime="tag.lastTransitionTime"
      :currentString.sync="lastTransitionString"
      :pointInTime="-1"
      :withoutPrefixOrSuffix="true">
    </time-string>
  </div>
</template>

<script>
import get from 'lodash/get'
import join from 'lodash/join'
import map from 'lodash/map'
import split from 'lodash/split'
import dropRight from 'lodash/dropRight'
import last from 'lodash/last'
import first from 'lodash/first'
import snakeCase from 'lodash/snakeCase'
import includes from 'lodash/includes'
import upperFirst from 'lodash/upperFirst'

import GPopper from '@/components/GPopper'
import TimeString from '@/components/TimeString'
import AnsiText from '@/components/AnsiText'
import { mapGetters, mapState, mapMutations } from 'vuex'

export default {
  components: {
    GPopper,
    TimeString,
    AnsiText
  },
  props: {
    condition: {
      type: Object,
      required: true
    },
    popperKey: {
      type: String,
      required: true
    },
    popperPlacement: {
      type: String
    }
  },
  data () {
    return {
      popperRendered: false,
      lastTransitionString: undefined,
      popperVisible: false
    }
  },
  computed: {
    ...mapState([
      'cfg',
      'conditionCache'
    ]),
    ...mapGetters([
      'isAdmin'
    ]),
    chipText () {
      return this.tag.shortName || ''
    },
    chipTitle () {
      return this.generateChipTitle({ name: this.tag.name, timeString: this.lastTransitionString })
    },
    chipTooltip () {
      return {
        title: this.generateChipTitle({ name: this.tag.name }),
        description: this.tag.description
      }
    },
    isError () {
      if (this.tag.status === 'False') {
        return true
      }
      return false
    },
    isUnknown () {
      if (this.tag.status === 'Unknown') {
        return true
      }
      return false
    },
    isProgressing () {
      if (this.tag.status === 'Progressing') {
        return true
      }
      return false
    },
    popperKeyWithType () {
      return `statusTag_${this.popperKey}`
    },
    tag () {
      const { lastTransitionTime, lastUpdateTime, message, status, type } = this.condition
      const id = type
      const { displayName: name, shortName, description } = this.conditionMetadataFromType(type)

      return { id, name, shortName, description, message, lastTransitionTime, lastUpdateTime, status }
    },
    color () {
      if (this.isError) {
        return 'error'
      }
      if (this.isUnknown) {
        return 'grey lighten-1'
      }
      if (this.isProgressing && this.isAdmin) {
        return 'blue darken-2'
      }
      return 'cyan darken-2'
    },
    visible () {
      if (!this.isAdmin) {
        const { type } = this.condition

        const conditionMetadata = this.conditionMetadataFromType(type)
        return !get(conditionMetadata, 'showAdminOnly', false)
      }
      return true
    },
    tooltipDisabled () {
      return this.popperVisible
    }
  },
  methods: {
    ...mapMutations([
      'setCondition'
    ]),
    generateChipTitle ({ name, timeString }) {
      let since = ''
      let errorState

      if (this.isError) {
        errorState = 'ERROR'
      }
      if (this.isUnknown) {
        errorState = 'UNKNOWN'
      }
      if (this.isProgressing) {
        errorState = 'PROGRESSING'
      }

      if (!errorState) {
        return name
      }

      if (timeString) {
        since = ` since ${timeString}`
      }

      return `${name} [${errorState}${since}]`
    },
    conditionMetadataFromType (type) {
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
    },
    onPopperInput (value) {
      this.popperVisible = value
    }
  }
}
</script>

<style lang="scss" scoped>

  .cursor-pointer ::v-deep .v-chip__content {
    cursor: pointer;
  }

  .status-tag {
    margin: 1px;
  }

  .status-tag ::v-deep .v-chip__content {
    margin: -4px;
  }
</style>
