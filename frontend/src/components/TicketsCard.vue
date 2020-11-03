<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="gitHubRepoUrl">
    <template v-if="tickets.length">
      <v-card v-for="ticket in tickets" :key="ticket.metadata.issueNumber">
        <ticket :ticket="ticket"></ticket>
      </v-card>
      <div class="d-flex align-center justify-center mt-4">
        <v-btn text color="cyan darken-2" :href="createTicketLink" target="_blank" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="cyan darken-2" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </template>
    <v-card v-else>
      <v-toolbar flat dark dense color="cyan darken-2">
        <v-toolbar-title class="subtitle-1">Ticket</v-toolbar-title>
      </v-toolbar>
      <v-card-actions class="d-flex justify-center">
        <v-btn text color="cyan darken-2" :href="createTicketLink" target="_blank" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="cyan darken-2" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import get from 'lodash/get'
import join from 'lodash/join'
import map from 'lodash/map'
import template from 'lodash/template'
import uniq from 'lodash/uniq'
import { mapState } from 'vuex'
import Ticket from '@/components/ShootTickets/Ticket'
import { shootItem } from '@/mixins/shootItem'
import moment from 'moment-timezone'

export default {
  components: {
    Ticket
  },
  props: {
    tickets: {
      type: Array
    },
    shootItem: {
      type: Object,
      required: true
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapState([
      'cfg'
    ]),
    gitHubRepoUrl () {
      return get(this.cfg, 'ticket.gitHubRepoUrl')
    },
    newTicketLabels () {
      return get(this.cfg, 'ticket.newTicketLabels')
    },
    issueDescription () {
      const descriptionTemplate = get(this.cfg, 'ticket.issueDescriptionTemplate')
      const compiled = template(descriptionTemplate)
      return compiled({
        shootName: this.shootName,
        shootNamespace: this.shootNamespace,
        shootCreatedAt: this.shootCreatedAt,
        shootUrl: this.shootUrl,
        providerType: this.shootCloudProviderKind,
        region: this.shootRegion,
        machineImageNames: this.shootMachineImageNames,
        projectName: this.shootProjectName,
        utcDateTimeNow: moment().utc().format(),
        seedName: this.shootSeedName
      })
    },
    shootUrl () {
      return `${window.location.origin}/namespace/${this.shootNamespace}/shoots/${this.shootName}`
    },
    shootMachineImageNames () {
      const workers = get(this.shootItem, 'spec.provider.workers')
      let imageNames = map(workers, worker => get(worker, 'machine.image.name'))
      imageNames = uniq(imageNames)
      return imageNames.join(', ')
    },
    newTicketLabelsString () {
      return join(this.newTicketLabels, ',')
    },
    createTicketLink () {
      const ticketTitle = encodeURIComponent(`[${this.shootProjectName}/${this.shootName}]`)
      const body = encodeURIComponent(this.issueDescription)
      const newTicketLabels = encodeURIComponent(this.newTicketLabelsString)

      return `${this.gitHubRepoUrl}/issues/new?title=${ticketTitle}&body=${body}&labels=${newTicketLabels}`
    }
  }
}
</script>

<style lang="scss" scoped>
  .link-icon {
    font-size: 1.2em;
    text-decoration: none;
  }
</style>
