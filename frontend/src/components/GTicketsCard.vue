<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="gitHubRepoUrl"
    class="mb-4"
  >
    <v-card
      v-if="openTickets.length || closedTickets.length"
      class="overflow-hidden mb-4"
    >
      <g-toolbar title="Tickets" />
      <div class="d-flex flex-column ga-5 ga-sm-6 pa-4 pa-sm-6">
        <section v-if="openTickets.length">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon
              icon="mdi-record-circle-outline"
              size="small"
              color="primary"
            />
            <span class="text-body-large">Open</span>
            <v-chip
              size="small"
              variant="tonal"
              color="tonal-primary"
            >
              {{ openTickets.length }}
            </v-chip>
          </div>
          <g-ticket-list :tickets="openTickets" />
        </section>
        <section v-if="closedTickets.length">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon
              icon="mdi-check-circle-outline"
              size="small"
            />
            <span class="text-body-large">Closed</span>
            <v-chip
              size="small"
              variant="tonal"
            >
              {{ closedTickets.length }}
            </v-chip>
            <span
              v-if="closedTicketsLookbackLabel"
              class="ml-auto text-body-small"
            >
              {{ closedTicketsLookbackLabel }}
            </span>
          </div>
          <g-ticket-list :tickets="closedTickets" />
        </section>
      </div>
      <v-divider />
      <div class="d-flex align-center justify-end py-3 px-4">
        <v-btn
          variant="tonal"
          color="tonal-primary"
          :href="sanitizeUrl(ticketLink)"
          target="_blank"
          rel="noopener"
          title="Create Ticket"
          append-icon="mdi-open-in-new"
        >
          Create Ticket
        </v-btn>
      </div>
    </v-card>
    <v-card v-else>
      <g-toolbar title="Tickets" />
      <div class="d-flex justify-center pa-4">
        <v-btn
          variant="tonal"
          color="tonal-primary"
          :href="sanitizeUrl(ticketLink)"
          target="_blank"
          rel="noopener"
          title="Create Ticket"
          append-icon="mdi-open-in-new"
        >
          Create Ticket
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useConfigStore } from '@/store/config'
import { useTicketStore } from '@/store/ticket'

import GTicketList from '@/components/ShootTickets/GTicketList.vue'

import { useShootItem } from '@/composables/useShootItem'

import moment from '@/utils/moment'

import get from 'lodash/get'
import map from 'lodash/map'
import template from 'lodash/template'
import uniq from 'lodash/uniq'
import cloneDeep from 'lodash/cloneDeep'
import orderBy from 'lodash/orderBy'

export default {
  components: {
    GTicketList,
  },
  inject: ['sanitizeUrl'],
  setup () {
    const {
      shootItem,
      shootNamespace,
      shootName,
      shootProjectName,
      shootCreatedAt,
      shootProviderType,
      shootRegion,
      shootSeedName,
      shootAccessRestrictions,
    } = useShootItem()

    return {
      shootItem,
      shootNamespace,
      shootName,
      shootProjectName,
      shootCreatedAt,
      shootProviderType,
      shootRegion,
      shootSeedName,
      shootAccessRestrictions,
    }
  },
  computed: {
    ...mapState(useConfigStore, {
      ticketConfig: 'ticket',
    }),
    openTickets () {
      const tickets = this.ticketsByProjectAndName({
        projectName: this.shootProjectName,
        name: this.shootName,
      }).filter(ticket => ticket.metadata.state === 'open')
      return orderBy(tickets, ['metadata.state'], ['desc'])
    },
    closedTickets () {
      const tickets = this.ticketsByProjectAndName({
        projectName: this.shootProjectName,
        name: this.shootName,
      }).filter(ticket => ticket.metadata.state === 'closed')
      return orderBy(tickets, ['metadata.state'], ['desc'])
    },
    closedTicketsLookbackLabel () {
      const days = get(this.ticketConfig, ['closedIssuesLookbackDays'], 0)
      if (days <= 0) {
        return ''
      }
      const dayLabel = days === 1 ? 'day' : 'days'
      return `Last ${days} ${dayLabel}`
    },
    gitHubRepoUrl () {
      return get(this.ticketConfig, ['gitHubRepoUrl'])
    },
    shootUrl () {
      const url = new URL(`/projects/${this.shootProjectName}/clusters/${this.shootName}`, window.location)
      return url.toString()
    },
    shootMachineImageNames () {
      const workers = get(this.shootItem, ['spec', 'provider', 'workers'])
      let imageNames = map(workers, worker => get(worker, ['machine', 'image', 'name']))
      imageNames = uniq(imageNames)
      return imageNames.join(', ')
    },
    ticketLink () {
      const newIssue = cloneDeep(get(this.ticketConfig, ['newIssue'], {}))
      if (!newIssue.title) {
        newIssue.title = `[${this.shootProjectName}/${this.shootName}]`
      }

      const options = {
        shootName: this.shootName,
        shootNamespace: this.shootNamespace,
        shootCreatedAt: this.shootCreatedAt,
        shootUrl: this.shootUrl,
        providerType: this.shootProviderType,
        region: this.shootRegion,
        machineImageNames: this.shootMachineImageNames,
        projectName: this.shootProjectName,
        utcDateTimeNow: moment().utc().format(),
        seedName: this.shootSeedName,
        accessRestrictions: this.shootAccessRestrictions,
      }

      const baseUrl = new URL(this.gitHubRepoUrl)
      if (!baseUrl.pathname.endsWith('/')) {
        baseUrl.pathname += '/'
      }
      const url = new URL('issues/new', baseUrl)
      for (const [key, value] of Object.entries(newIssue)) {
        if (typeof value === 'string') {
          const templatedValue = this.applyTemplate(value, options)
          url.searchParams.append(key, templatedValue)
        } else if (Array.isArray(value)) {
          const templatedValues = value.map(v => {
            return this.applyTemplate(v, options)
          })
          url.searchParams.append(key, templatedValues)
        }
      }
      return url.toString()
    },
  },
  methods: {
    ...mapActions(useTicketStore, {
      ticketsByProjectAndName: 'issues',
    }),
    applyTemplate (value, options) {
      if (!value) {
        return ''
      }

      const compiled = template(value)
      return compiled(options)
    },
  },
}
</script>
