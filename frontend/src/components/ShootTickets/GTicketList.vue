<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-expansion-panels
    flat
    variant="accordion"
    class="border rounded-lg overflow-hidden"
  >
    <v-expansion-panel
      v-for="ticket in tickets"
      :key="ticket.metadata.id"
    >
      <v-expansion-panel-title class="py-3 px-4">
        <g-external-link
          class="ticket-summary__link position-relative mr-2"
          :url="ticket.data.html_url"
          @click.stop
          @keydown.stop
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
      <v-expansion-panel-text class="border-t-sm">
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
  },
}
</script>
<style scoped>
.ticket-summary__link {
  z-index: 1;
}
</style>
