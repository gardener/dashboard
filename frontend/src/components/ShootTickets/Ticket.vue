<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-card>
    <v-card-title class="subtitle-1 white--text cyan darken-2 mt-4 ticketTitle">
      Ticket {{ticketTitle}}<ticket-labels class="ml-2" :labels="ticket.data.labels"></ticket-labels>
    </v-card-title>

    <v-container>
      <span class="font-weight-bold">{{login}}</span> created this
      <a :href="ticketHtmlUrl" target="_blank" class="cyan--text text--darken-2">ticket</a>
      <a :href="ticketHtmlUrl" target="_blank" class="link-icon"><v-icon color="cyan darken-2" class="link-icon">mdi-open-in-new</v-icon></a>
      <time-string :dateTime="ticket.metadata.created_at" mode="past"></time-string>
    </v-container>
    <v-container>
      <ticket-comment :comment="ticket"></ticket-comment>
      <ticket-comment v-for="comment in commentsForTicket" :key="comment.metadata.id" :comment="comment"></ticket-comment>
    </v-container>
    <v-card-actions v-if="!!gitHubRepoUrl">
      <v-spacer></v-spacer>
      <v-btn text class="action-button cyan--text text--darken-2" :href="addCommentLink" target="_blank" title="Add Comment">
        Add Comment
        <v-icon color="cyan darken-2" class="link-icon pl-2">mdi-open-in-new</v-icon>
      </v-btn>
      <v-spacer></v-spacer>
    </v-card-actions>
  </v-card>
</template>

<script>
import get from 'lodash/get'
import { mapState, mapGetters } from 'vuex'
import TimeString from '@/components/TimeString'
import TicketLabels from '@/components/ShootTickets/TicketLabels'
import TicketComment from '@/components/ShootTickets/TicketComment'

export default {
  components: {
    TimeString,
    TicketLabels,
    TicketComment
  },
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
    ...mapGetters([
      'ticketCommentsByIssueNumber'
    ]),
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

  .ticketTitle {
    line-height: 10px;
  }

  .link-icon {
    font-size: 120%;
    text-decoration: none;
  }
</style>
