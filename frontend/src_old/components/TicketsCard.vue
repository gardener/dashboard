<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="gitHubRepoUrl">
    <template v-if="tickets.length">
      <v-card v-for="ticket in tickets" :key="ticket.metadata.issueNumber">
        <ticket :ticket="ticket"></ticket>
      </v-card>
      <div class="d-flex align-center justify-center mt-4">
        <v-btn variant="text" color="primary" :href="sanitizeUrl(createTicketLink)" target="_blank" rel="noopener" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </template>
    <v-card v-else>
      <v-toolbar flat dense color="toolbar-background toolbar-title--text">
        <v-toolbar-title class="text-subtitle-1">Ticket</v-toolbar-title>
      </v-toolbar>
      <v-card-actions class="d-flex justify-center">
        <v-btn variant="text" color="primary" :href="sanitizeUrl(createTicketLink)" target="_blank" rel="noopener" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import join from 'lodash/join'
import map from 'lodash/map'
import template from 'lodash/template'
import uniq from 'lodash/uniq'

import Ticket from '@/components/ShootTickets/Ticket.vue'
import { shootItem } from '@/mixins/shootItem'
import sanitizeUrl from '@/mixins/sanitizeUrl'
import moment from '@/utils/moment'

export default {
  components: {
    Ticket
  },
  mixins: [shootItem, sanitizeUrl],
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters('tickets', {
      ticketsByProjectAndName: 'issues'
    }),
    tickets () {
      return this.ticketsByProjectAndName({
        projectName: this.shootProjectName,
        name: this.shootName
      })
    },
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
        seedName: this.shootSeedName,
        accessRestrictions: this.shootSelectedAccessRestrictions
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
