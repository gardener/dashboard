<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-ticket-comment
    :comment="ticket"
    :timeline="commentsForTicket?.length > 0 || !!ticket.metadata.closed_at"
    :timeline-end="!commentsForTicket?.length && !!ticket.metadata.closed_at"
    initial
  />
  <g-ticket-comment
    v-for="(comment, index) in commentsForTicket"
    :key="comment.metadata.id"
    :comment="comment"
    :timeline="index !== commentsForTicket.length - 1 || !!ticket.metadata.closed_at"
    :timeline-end="index === commentsForTicket.length - 1 && !!ticket.metadata.closed_at"
  />
  <div
    v-if="ticket.metadata.closed_at"
    class="my-2 ml-12"
  >
    <v-chip
      color="tonal-secondary"
      variant="tonal"
      size="small"
      prepend-icon="mdi-check-circle-outline"
    >
      Closed<g-time-string
        :date-time="ticket.metadata.closed_at"
        mode="past"
        content-class="ml-1"
      />
    </v-chip>
  </div>

  <v-card-actions v-if="!!gitHubRepoUrl">
    <v-spacer />
    <v-btn
      variant="tonal"
      color="tonal-primary"
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
    ticketHtmlUrl () {
      return get(this.ticket, ['data', 'html_url'])
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
