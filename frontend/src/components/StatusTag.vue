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
        <v-tooltip slot="popperRef" top max-width="400px">
          <v-chip class="cursor-pointer status-tag" slot="activator" outline :text-color="chipTextColor" small :color="color">
            {{chipText}}
          </v-chip>
          <span v-html="chipTooltip"></span>
        </v-tooltip>
      </g-popper>
    </template>
    <template v-else max-width="400px">
      <v-tooltip top>
        <v-chip class="status-tag" slot="activator" outline :text-color="chipTextColor" small :color="color">
          {{chipText}}
        </v-chip>
        <span v-html="chipTooltip"></span>
      </v-tooltip>
    </template>
    <time-string v-if="popperRendered" v-show="false" :dateTime="tag.lastTransitionTime" :currentString.sync="lastTransitionString" :pointInTime="-1" :withoutPrefixOrSuffix="true"></time-string>
  </span>
</template>

<script>
import get from 'lodash/get'
import join from 'lodash/join'
import merge from 'lodash/merge'
import GPopper from '@/components/GPopper'
import TimeString from '@/components/TimeString'
import { mapGetters, mapState } from 'vuex'

const knownConditions = {
  APIServerAvailable: {
    displayName: 'API Server',
    shortName: 'API',
    description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.'
  },
  ControlPlaneHealthy: {
    displayName: 'Control Plane',
    shortName: 'CP',
    description: 'Indicates whether all control plane components are up and running.',
    showAdminOnly: true
  },
  EveryNodeReady: {
    displayName: 'Nodes',
    shortName: 'N',
    description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.'
  },
  SystemComponentsHealthy: {
    displayName: 'System Components',
    shortName: 'SC',
    description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.'
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
    ...mapState([
      'cfg'
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
      const title = `<span class="font-weight-bold">${this.generateChipTitle({ name: this.tag.name })}</span>`
      if (this.tag.description) {
        return `${title}<br />${this.tag.description}`
      }
      return title
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
      const { displayName: name, shortName, description } = this.conditionFromType(type)

      return { id, name, shortName, description, message, lastTransitionTime, lastUpdateTime, status }
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
    }
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
    },
    conditionFromType (type) {
      let condition = knownConditions[type]
      if (condition) {
        return condition
      }
      let displayNameComponents = []
      let shortNameComponents = []
      const conditionPattern = /[A-Z]*([A-Z])[a-z]*/g
      let conditionComponent
      while ((conditionComponent = conditionPattern.exec(type)) !== null) {
        displayNameComponents.push(conditionComponent[0])
        shortNameComponents.push(conditionComponent[1])
      }
      if (shortNameComponents.length > 1) {
        // Remove last component as it is usually not part of the condition name (e.g. availability)
        shortNameComponents = shortNameComponents.slice(0, shortNameComponents.length - 1)
        displayNameComponents = displayNameComponents.slice(0, displayNameComponents.length - 1)
      }

      const displayName = join(displayNameComponents, ' ')
      const shortName = join(shortNameComponents, '')
      knownConditions[type] = { displayName, shortName } // cache
      return knownConditions[type]
    }
  },
  beforeMount () {
    merge(knownConditions, this.cfg.knownConditions)
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
