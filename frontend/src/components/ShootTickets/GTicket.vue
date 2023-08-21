<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-card-title class="text-subtitle-1 mt-4 ticket-toolbar bg-toolbar-background text-toolbar-title">
      <div class="d-flex flex-wrap align-center">
        <div class="ticket-title mr-2">
          Ticket {{ ticketTitle }}
        </div>
        <div
          v-if="labels.length"
          class="labels"
        >
          <g-ticket-label
            v-for="label in labels"
            :key="label.id"
            :label="label"
          />
        </div>
      </div>
    </v-card-title>

    <v-container>
      <span class="font-weight-bold">{{ login }}</span> created this
      <g-external-link :url="ticketHtmlUrl">
        ticket
      </g-external-link>
      <g-time-string
        :date-time="ticket.metadata.created_at"
        mode="past"
        content-class="ml-1"
      />
    </v-container>
    <g-ticket-comment
      :comment="ticket"
    />
    <g-ticket-comment
      v-for="comment in commentsForTicket"
      :key="comment.metadata.id"
      :comment="comment"
    />
    <v-card-actions v-if="!!gitHubRepoUrl">
      <v-spacer />
      <v-btn
        variant="text"
        color="primary"
        :href="sanitizeUrl(addCommentLink)"
        target="_blank"
        rel="noopener"
        title="Add Comment"
      >
        Add Comment
        <v-icon
          color="anchor"
          class="link-icon pl-2"
        >
          mdi-open-in-new
        </v-icon>
      </v-btn>
      <v-spacer />
    </v-card-actions>
  </v-card>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useConfigStore } from '@/store/config'
import { useTicketStore } from '@/store/ticket'

import GTimeString from '@/components/GTimeString.vue'
import GTicketLabel from '@/components/ShootTickets/GTicketLabel.vue'
import GTicketComment from '@/components/ShootTickets/GTicketComment.vue'
import GExternalLink from '@/components/GExternalLink.vue'

import { get } from '@/lodash'

export default {
  components: {
    GTimeString,
    GTicketLabel,
    GTicketComment,
    GExternalLink,
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
      const title = get(this.ticket, 'data.ticketTitle')
      return title ? ` - ${title}` : ''
    },
    login () {
      return get(this.ticket, 'data.user.login')
    },
    ticketHtmlUrl () {
      return get(this.ticket, 'data.html_url')
    },
    labels () {
      return get(this.ticket, 'data.labels', [])
    },
    commentsForTicket () {
      const issueNumber = get(this.ticket, 'metadata.number')
      return this.ticketCommentsByIssueNumber({ issueNumber })
    },
    gitHubRepoUrl () {
      return get(this.ticketConfig, 'gitHubRepoUrl')
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
  .ticket-toolbar {
    white-space: pre-wrap;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .ticket-title {
    line-height: 20px;
  }
  .labels {
    line-height: 10px;
  }

  .link-icon {
    font-size: 120%;
    text-decoration: none;
  }
</style>
