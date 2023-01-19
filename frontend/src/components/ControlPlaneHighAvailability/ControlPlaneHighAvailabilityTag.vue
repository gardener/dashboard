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
        outlined
        :small="!xSmall"
        :x-small="xSmall"
        :color="color"
        class="cursor-pointer ml-1"
      >
        {{shootControlPlaneHighAvailabilityFailureTolerance}}
      </v-chip>
    </template>
    <div class="text-left">
      Failure Tolerance: <code>{{shootControlPlaneHighAvailabilityFailureTolerance}}</code>
      <v-alert v-if="zoneHighAvailabilityConfigurationError" type="error" class="mt-2" max-width="600px">
        You configured your control plane failure tolerance type to be <code>zone</code>.
        However, no Seed assigned to your cloud profile currently supports this.
      </v-alert>
    </div>
  </g-popper>
</template>

<script>

import GPopper from '@/components/GPopper'
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
