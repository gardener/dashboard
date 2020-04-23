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
  <v-tooltip top>
    <template v-slot:activator="{ on }">
      <span v-on="on" class="d-flex">
        <infra-icon v-model="shootCloudProviderKind" content-class="mr-2"></infra-icon>
        <span>{{ description }}</span>
      </span>
    </template>
    <div>
      <span class="font-weight-bold">Provider:</span> <infra-icon v-model="shootCloudProviderKind" content-class="mr-2"></infra-icon>{{ shootCloudProviderKind }}
    </div>
    <div>
      <span class="font-weight-bold">Region:</span> {{ shootRegion }}
    </div>
    <div v-if="shootZones.length">
      <span class="font-weight-bold">{{zoneTitle}}:</span> {{shootZonesText}}
    </div>
  </v-tooltip>
</template>

<script>
import join from 'lodash/join'
import InfraIcon from '@/components/VendorIcon'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    InfraIcon
  },
  props: {
    shootItem: {
      type: Object,
      required: true
    },
    extended: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    shootZonesText () {
      return join(this.shootZones, ', ')
    },
    zoneTitle () {
      if (this.shootZones.length > 1) {
        return 'Zones'
      }
      return 'Zone'
    },
    description () {
      const description = []
      if (this.extended) {
        description.push(this.shootCloudProviderKind)
        description.push(this.shootRegion)
        if (this.shootZones.length > 0) {
          description.push(this.shootZonesText)
        }
      } else {
        description.push(this.shootRegion)
      }

      return join(description, ' / ')
    }
  }
}
</script>
