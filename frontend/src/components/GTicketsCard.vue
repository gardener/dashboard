<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="gitHubRepoUrl">
    <template v-if="tickets.length">
      <v-card v-for="ticket in tickets" :key="ticket.metadata.issueNumber">
        <g-ticket :ticket="ticket"></g-ticket>
      </v-card>
      <div class="d-flex align-center justify-center mt-4">
        <v-btn text color="primary" :href="sanitizeUrl(createTicketLink)" target="_blank" rel="noopener" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </template>
    <v-card v-else>
      <g-toolbar title="Ticket" />
      <div class="d-flex justify-center pa-3">
        <v-btn variant="text" color="primary" :href="sanitizeUrl(createTicketLink)" target="_blank" rel="noopener" title="Create Ticket">
          <span class="pr-2">Create Ticket</span>
          <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import get from 'lodash/get'
import join from 'lodash/join'
import map from 'lodash/map'
import template from 'lodash/template'
import uniq from 'lodash/uniq'

import GTicket from '@/components/ShootTickets/GTicket'
import { shootItem } from '@/mixins/shootItem'
import moment from '@/utils/moment'

import { useConfigStore, useTicketStore } from '@/store'

export default {
  components: {
    GTicket,
  },
  inject: ['sanitizeUrl'],
  mixins: [shootItem],
  computed: {
    ...mapState(useConfigStore, {
      ticketConfig: 'ticket',
    }),
    tickets () {
      return this.ticketsByProjectAndName({
        projectName: this.shootProjectName,
        name: this.shootName,
      })
    },
    gitHubRepoUrl () {
      return get(this.ticketConfig, 'gitHubRepoUrl')
    },
    newTicketLabels () {
      return get(this.ticketConfig, 'newTicketLabels')
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
        accessRestrictions: this.shootSelectedAccessRestrictions,
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
    },
  },
  methods: {
    ...mapActions(useTicketStore, {
      ticketsByProjectAndName: 'issues',
    }),
  }
}
</script>

<style lang="scss" scoped>
  .link-icon {
    font-size: 1.2em;
    text-decoration: none;
  }
</style>
