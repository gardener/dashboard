<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-chip
    :color="ticket.metadata.closed_at ? 'secondary' : 'primary'"
    variant="flat"
    class="ticket-status-chip"
  >
    <v-icon>
      {{ ticket.metadata.closed_at ? 'mdi-check-circle-outline' : 'mdi-record-circle-outline' }}
    </v-icon>
    {{ ticket.metadata.state === 'open' ? 'Open' : 'Closed' }}
  </v-chip>
  <g-ticket-comment
    :comment="ticket"
    :timeline="commentsForTicket?.length"
    initial="true"
  />
  <g-ticket-comment
    v-for="(comment, index) in commentsForTicket"
    :key="comment.metadata.id"
    :comment="comment"
    :timeline="index != commentsForTicket.length - 1 || ticket.metadata.state === 'closed' "
  />
  <div v-if="ticket.metadata.closed_at">
    <v-chip
      color="secondary"
      variant="flat"
      class="ticket-closed-chip"
    >
      <v-icon>
        {{ ticket.metadata.closed_at ? 'mdi-check-circle-outline' : 'mdi-record-circle-outline' }}
      </v-icon>
    </v-chip>
    closed<g-time-string
      :date-time="ticket.metadata.closed_at"
      mode="past"
      content-class="ml-1"
    />
  </div>

  <v-card-actions v-if="!!gitHubRepoUrl">
    <v-spacer />
    <v-btn
      variant="text"
      color="primary"
      :href="sanitizeUrl(addCommentLink)"
      target="_blank"
      rel="noopener"
      title="Add Comment"
      append-icon="mdi-open-in-new"
    >
      Add Comment
    </v-btn>
    <v-spacer />
  </v-card-actions>
  <!-- </v-card> -->
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useConfigStore } from '@/store/config'
import { useTicketStore } from '@/store/ticket'

import GTimeString from '@/components/GTimeString.vue'
import GTicketComment from '@/components/ShootTickets/GTicketComment.vue'

import get from 'lodash/get'

export default {
  components: {
    GTimeString,
    GTicketComment,
  },
  inject: ['sanitizeUrl'],
  props: {
    ticket: {
      type: Object,
      required: true,
    },
  },
  computed: {
    ...mapState(useConfigStore, {
      ticketConfig: 'ticket',
    }),
    ticketTitle () {
      const title = get(this.ticket, ['data', 'ticketTitle'])
      return title ? ` - ${title}` : ''
    },
    login () {
      return get(this.ticket, ['data', 'user', 'login'])
    },
    ticketHtmlUrl () {
      return get(this.ticket, ['data', 'html_url'])
    },
    labels () {
      return get(this.ticket, ['data', 'labels'], [])
    },
    commentsForTicket () {
      const issueNumber = get(this.ticket, ['metadata', 'number'])
      return this.ticketCommentsByIssueNumber({ issueNumber })
    },
    gitHubRepoUrl () {
      return get(this.ticketConfig, ['gitHubRepoUrl'])
    },
    addCommentLink () {
      return `${this.ticketHtmlUrl}#new_comment_field`
    },
  },
  methods: {
    ...mapActions(useTicketStore, {
      ticketCommentsByIssueNumber: 'comments',
    }),
  },
}
</script>

<style lang="scss" scoped>
  .ticket-title {
    line-height: 20px;
  }
  .ticket-labels {
    overflow-y: auto;
    max-height: 30px;
  }

  .link-icon {
    font-size: 120%;
    text-decoration: none;
  }
  .v-expansion-panel {
    margin-top: 0px;
  }
  .ticket-status-chip {
    margin-left:64px;
    margin-bottom: 10px;
  }
  .ticket-closed-chip {
    margin-left: 65px
  }
</style>
