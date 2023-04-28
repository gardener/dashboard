<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    v-if="shootControlPlaneHighAvailabilityFailureTolerance"
    title="Control Plane High Availability"
    :popper-key="`cp_ha_tag_${shootControlPlaneHighAvailabilityFailureTolerance}`"
    :toolbar-color="color"
  >
    <template v-slot:popperRef>
      <v-chip
        variant="outlined"
        :small="!xSmall"
        :x-small="xSmall"
        :color="color"
        class="cursor-pointer ml-1"
      >
        {{shootControlPlaneHighAvailabilityFailureTolerance}}
      </v-chip>
    </template>
    <template v-slot:card>
      <v-list class="text-left" style="max-width: 600px;">
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-information-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Failure Tolerance</v-list-item-subtitle>
            <v-list-item-title>
              <code>{{shootControlPlaneHighAvailabilityFailureTolerance}}</code>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <template v-if="zoneHighAvailabilityConfigurationError">
          <v-divider inset></v-divider>
          <v-list-item>
            <v-list-item-icon>
              <v-icon color="error">mdi-alert-circle-outline</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-subtitle>Configuration Error</v-list-item-subtitle>
              <v-list-item-title class="wrap-text">
                You configured your control plane failure tolerance type to be <code>zone</code>.
                However, no seed assigned to your cloud profile currently supports this.
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </template>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper.vue'
import { shootItem } from '@/mixins/shootItem'
import { mapGetters } from 'vuex'
import some from 'lodash/some'

export default {
  components: {
    GPopper
  },
  props: {
    xSmall: {
      type: Boolean,
      default: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'seedsByCloudProfileName'
    ]),
    zoneSupported () {
      const seeds = this.seedsByCloudProfileName(this.shootCloudProfileName)
      return some(seeds, ({ data }) => data.zones?.length >= 3)
    },
    zoneHighAvailabilityConfigurationError () {
      return this.shootControlPlaneHighAvailabilityFailureTolerance === 'zone' &&
        !this.zoneSupported &&
        !this.shootSeedName
    },
    color () {
      if (this.zoneHighAvailabilityConfigurationError) {
        return 'error'
      }
      return 'primary'
    }
  }
}
</script>
