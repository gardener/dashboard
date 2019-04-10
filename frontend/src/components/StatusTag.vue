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
  <span v-if="visible">
    <template v-if="tag.message">
      <g-popper @rendered="popperRendered=true" :title="chipTitle" :message="tag.message" :toolbarColor="color" :time="{ caption: 'Last updated:', dateTime: tag.lastUpdateTime }" :popperKey="popperKeyWithType" :placement="popperPlacement">
        <v-tooltip slot="popperRef" top>
          <v-chip class="cursor-pointer status-tag" slot="activator" outline :text-color="chipTextColor" small :color="color">
            {{chipText}}
          </v-chip>
          <span>{{chipTooltip}}</span>
        </v-tooltip>
      </g-popper>
    </template>
    <template v-else>
      <v-tooltip top>
        <v-chip class="status-tag" slot="activator" outline :text-color="chipTextColor" small :color="color">
          {{chipText}}
        </v-chip>
        <span>{{chipTooltip}}</span>
      </v-tooltip>
    </template>
    <time-string v-if="popperRendered" v-show="false" :dateTime="tag.lastTransitionTime" :currentString.sync="lastTransitionString" :pointInTime="-1" :withoutPrefixOrSuffix="true"></time-string>
  </span>
</template>

<script>
import replace from 'lodash/replace'
import get from 'lodash/get'
import GPopper from '@/components/GPopper'
import TimeString from '@/components/TimeString'
import { mapGetters } from 'vuex'

const knownConditions = {
  APIServerAvailable: {
    displayName: 'API Server',
    shortName: 'API'
  },
  ControlPlaneHealthy: {
    displayName: 'Control Plane',
    shortName: 'CP',
    showAdminOnly: true
  },
  EveryNodeReady: {
    displayName: 'Nodes',
    shortName: 'N'
  },
  SystemComponentsHealthy: {
    displayName: 'System Components',
    shortName: 'SC'
  }
}

export default {
  components: {
    GPopper,
    TimeString
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
      lastTransitionString: undefined
    }
  },
  computed: {
    chipText () {
      return this.tag.shortName || ''
    },
    chipTitle () {
      return this.generateChipTitle({ name: this.tag.name, timeString: this.lastTransitionString })
    },
    chipTooltip () {
      return this.generateChipTitle({ name: this.tag.name })
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
      const name = get(knownConditions, [type, 'displayName'], replace(type, /([a-z])([A-Z])/g, '$1 $2'))
      const shortName = get(knownConditions, [type, 'shortName'], replace(name, /^([A-Z])[\w]*(\s(([A-Z])\w*))?/, '$1$4'))

      return { id, name, shortName, message, lastTransitionTime, lastUpdateTime, status }
    },
    color () {
      if (this.isError) {
        return 'red'
      }
      if (this.isUnknown) {
        return 'grey lighten-1'
      }
      if (this.isProgressing && this.isAdmin) {
        return 'blue darken-2'
      }
      return 'cyan darken-2'
    },
    chipTextColor () {
      if (this.isError) {
        return 'red'
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
        return !get(knownConditions, [type, 'showAdminOnly'], false)
      }
      return true
    },
    ...mapGetters([
      'isAdmin'
    ])
  },
  methods: {
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
    }
  }
}
</script>

<style lang="styl" scoped>

  .cursor-pointer >>> .v-chip__content {
    cursor: pointer;
  }

  .status-tag {
    margin: 1px;
  }

  .status-tag >>> .v-chip__content {
    margin: -4px;
  }

</style>
