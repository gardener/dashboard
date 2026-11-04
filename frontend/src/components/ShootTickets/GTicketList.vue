<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-expansion-panels>
    <v-expansion-panel
      v-for="ticket in tickets"
      :key="ticket.metadata.id"
    >
      <v-expansion-panel-title
        expand-icon="mdi-menu-down"
        :class="{ faint: faint }"
      >
        <g-external-link
          class="mr-2"
          :url="ticket.data.html_url"
        >
          #{{ ticket.metadata.number }}
        </g-external-link>
        <div class="mr-2">
          {{ ticket.data.ticketTitle }}
        </div>
        <div>
          <g-ticket-label
            v-for="label in ticket.data?.labels"
            :key="label.id"
            :label="label"
          />
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <g-ticket :ticket="ticket" />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import GTicket from '@/components/ShootTickets/GTicket'
import GTicketLabel from '@/components/ShootTickets/GTicketLabel.vue'

export default {
  components: {
    GTicket,
    GTicketLabel,
  },
  props: {
    tickets: {
      type: Array,
      required: true,
    },
    faint: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
}
</script>
<style scoped>
.faint {
  opacity: 0.6;
}
</style>
