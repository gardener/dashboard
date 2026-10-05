<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-expansion-panels>
    <v-expansion-panel
      v-for="ticket in tickets"
      :key="ticket.metadata.issueNumber"
    >
      <v-expansion-panel-title expand-icon="mdi-menu-down">
        <g-external-link
          class="mr-2"
          :url="ticket.data.html_url"
        >
          #{{ ticket.metadata.number }}
        </g-external-link>
        {{ ticket.data.ticketTitle }}
        <g-ticket-label
          v-for="label in ticket.data?.labels"
          :key="label.id"
          :label="label"
        />
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
  },
}
</script>
