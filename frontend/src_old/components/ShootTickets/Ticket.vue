<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-card-title class="text-subtitle-1 mt-4 ticket-toolbar toolbar-background toolbar-title--text">
      <div class="d-flex flex-wrap align-center">
        <div class="ticket-title mr-2">Ticket {{ticketTitle}}</div>
        <div v-if="labels.length" class="labels"><ticket-label v-for="label in labels" :key="label.id" :label="label"></ticket-label></div>
      </div>
    </v-card-title>

    <v-container>
      <span class="font-weight-bold">{{login}}</span> created this
      <external-link :url="ticketHtmlUrl">ticket</external-link>
      <time-string :date-time="ticket.metadata.created_at" mode="past" content-class="ml-1"></time-string>
    </v-container>
    <v-list>
      <ticket-comment :comment="ticket"></ticket-comment>
      <ticket-comment v-for="comment in commentsForTicket" :key="comment.metadata.id" :comment="comment"></ticket-comment>
    </v-list>
    <v-card-actions v-if="!!gitHubRepoUrl">
      <v-spacer></v-spacer>
      <v-btn variant="text" color="primary" :href="sanitizeUrl(addCommentLink)" target="_blank" rel="noopener" title="Add Comment">
        Add Comment
        <v-icon color="anchor" class="link-icon pl-2">mdi-open-in-new</v-icon>
      </v-btn>
      <v-spacer></v-spacer>
    </v-card-actions>
  </v-card>
</template>

<script>
import get from 'lodash/get'
import { mapState, mapGetters } from 'vuex'
import TimeString from '@/components/TimeString.vue'
import TicketLabel from '@/components/ShootTickets/TicketLabel.vue'
import TicketComment from '@/components/ShootTickets/TicketComment.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import sanitizeUrl from '@/mixins/sanitizeUrl'

export default {
  components: {
    TimeString,
    TicketLabel,
    TicketComment,
    ExternalLink
  },
  mixins: [sanitizeUrl],
  props: {
    ticket: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters('tickets', {
      ticketCommentsByIssueNumber: 'comments'
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
      return get(this.cfg, 'ticket.gitHubRepoUrl')
    },
    addCommentLink () {
      return `${this.ticketHtmlUrl}#new_comment_field`
    }
  }
}
</script>

<style lang="scss" scoped>
  .ticket-toolbar {
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
