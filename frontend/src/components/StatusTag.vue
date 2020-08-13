<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
      :title="tag.name"
      :toolbarColor="color"
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
                <v-icon v-if="isUserError" small left>mdi-account-alert</v-icon>
                {{chipText}}
              </v-chip>
            </template>
            <div class="font-weight-bold">{{chipTooltip.title}}</div>
            <div>Status: {{chipTooltip.status}}</div>
            <div v-for="({ shortDescription }) in chipTooltip.userErrorCodeObjects" :key="shortDescription">
              <v-icon class="mr-1" color="white" small>mdi-account-alert</v-icon>
              <span class="font-weight-bold text--lighten-2">{{shortDescription}}</span>
            </div>
            <template v-if="chipTooltip.description">
              <v-divider color="white"></v-divider>
              <div>
                {{chipTooltip.description}}
              </div>
            </template>
          </v-tooltip>
        </div>
      </template>
      <shoot-message-details
        :statusTitle="chipStatus"
        :lastMessage="nonErrorMessage"
        :errorDescriptions="errorDescriptions"
        :lastUpdateTime="tag.lastUpdateTime"
        :lastTransitionTime="tag.lastTransitionTime"
        :secretName="secretName"
        :namespace="namespace"
      />
    </g-popper>
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
import isEmpty from 'lodash/isEmpty'
import filter from 'lodash/filter'

import GPopper from '@/components/GPopper'
import ShootMessageDetails from '@/components/ShootMessageDetails'
import { mapGetters, mapState, mapMutations } from 'vuex'
import { isUserError, objectsFromErrorCodes } from '@/utils/errorCodes'

export default {
  components: {
    GPopper,
    ShootMessageDetails
  },
  props: {
    condition: {
      type: Object,
      required: true
    },
    secretName: {
      type: String
    },
    namespace: {
      type: String
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
    chipStatus () {
      if (this.isError) {
        return 'Error'
      }
      if (this.isUnknown) {
        return 'Unknown'
      }
      if (this.isProgressing) {
        return 'Progressing'
      }

      return 'Healthy'
    },
    chipTooltip () {
      return {
        title: this.tag.name,
        status: this.chipStatus,
        description: this.tag.description,
        userErrorCodeObjects: filter(objectsFromErrorCodes(this.tag.codes), { userError: true })
      }
    },
    isError () {
      if (this.tag.status === 'False' || !isEmpty(this.tag.codes)) {
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
    isUserError () {
      return isUserError(this.tag.codes)
    },
    errorDescriptions () {
      if (this.isError) {
        return [
          {
            description: this.tag.message,
            errorCodeObjects: objectsFromErrorCodes(this.tag.codes)
          }
        ]
      }
      return undefined
    },
    nonErrorMessage () {
      if (!this.isError) {
        return this.tag.message
      }
      return undefined
    },
    popperKeyWithType () {
      return `statusTag_${this.popperKey}`
    },
    tag () {
      const { lastTransitionTime, lastUpdateTime, message, status, type, codes } = this.condition
      const id = type
      const { displayName: name, shortName, description } = this.conditionMetadataFromType(type)

      return { id, name, shortName, description, message, lastTransitionTime, lastUpdateTime, status, codes }
    },
    color () {
      if (this.isError) {
        return 'error'
      }
      if (this.isUnknown) {
        return 'grey'
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

  ::v-deep .v-card  {
  .v-card__text {
    padding: 0px;
    text-align: left;
  }
}
</style>
