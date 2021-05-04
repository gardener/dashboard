<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-popper
    title="No Hibernation Schedule"
    :popper-key="`no_hibernation_${namespace}/${name}`"
  >
    <div class="message">
      To reduce expenses, this <span class="font-weight-bold">{{purposeText}}</span> cluster should have a hibernation schedule.
      <template v-if="canPatchShoots">
        Please navigate to the cluster details page to
        <router-link :to="{ name: 'ShootItemHibernationSettings', params: { name, namespace } }">configure</router-link>
        a hibernation schedule or explicitly deactivate scheduled hibernation for this cluster.
      </template>
    </div>
    <template v-slot:popperRef>
      <v-btn icon>
        <v-tooltip top>
          <template v-slot:activator="{ on: tooltip }">
            <v-icon v-on="tooltip" color="primary">mdi-calendar-alert</v-icon>
          </template>
          <span>No Hibernation Schedule</span>
        </v-tooltip>
      </v-btn>
    </template>
  </g-popper>

</template>

<script>
import GPopper from '@/components/GPopper'
import { mapGetters } from 'vuex'

export default {
  name: 'hibernationschedulewarning',
  components: {
    GPopper
  },
  props: {
    name: {
      type: String
    },
    namespace: {
      type: String
    },
    purpose: {
      type: String
    }
  },
  computed: {
    ...mapGetters([
      'canPatchShoots'
    ]),
    purposeText () {
      return this.purpose || ''
    }
  }
}
</script>

<style lang="scss" scoped>

  .message {
    text-align: left;
    min-width: 250px;
    max-width: 800px;
    white-space: normal;
    overflow-y: auto;
  }

</style>
