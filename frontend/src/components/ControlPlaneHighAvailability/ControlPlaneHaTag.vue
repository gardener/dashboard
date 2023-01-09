<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    v-if="shootControlPlaneHaFailureTolerance"
    title="Control Plane High Availability"
    :popper-key="`cp_ha_tag_${shootControlPlaneHaFailureTolerance}`"
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
        {{shootControlPlaneHaFailureTolerance}}
      </v-chip>
    </template>
    <div class="ha-popper">
      Failure Tolerance: <code>{{shootControlPlaneHaFailureTolerance}}</code>
      <v-alert v-if="zoneHAConfigurationError" type="error" class="mt-2" max-width="600px">
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
  name: 'control-plane-ha-tag',
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
    zoneHAConfigurationError () {
      return this.shootControlPlaneHaFailureTolerance === 'zone' &&
        !this.zoneSupported &&
        !this.shootSeedName
    },
    color () {
      if (this.zoneHAConfigurationError) {
        return 'error'
      }
      return 'primary'
    }
  }
}
</script>

<style lang="scss" scoped>
  .ha-popper {
    text-align: left
  }
</style>
