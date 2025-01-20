<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div
    v-if="gitHubRepoUrl"
    class="mb-4"
  >
    <template v-if="tickets.length">
      <g-ticket
        v-for="ticket in tickets"
        :key="ticket.metadata.issueNumber"
        :ticket="ticket"
      />
      <div class="d-flex align-center justify-center">
        <v-btn
          variant="tonal"
          color="primary"
          :href="sanitizeUrl(ticketLink)"
          target="_blank"
          rel="noopener"
          title="Create Ticket"
          append-icon="mdi-open-in-new"
        >
          Create Ticket
        </v-btn>
      </div>
    </template>
    <v-card v-else>
      <g-toolbar title="Tickets" />
      <div class="d-flex justify-center pa-4">
        <v-btn
          variant="tonal"
          color="primary"
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

import GTicket from '@/components/ShootTickets/GTicket'

import { useShootItem } from '@/composables/useShootItem'

import moment from '@/utils/moment'

import get from 'lodash/get'
import map from 'lodash/map'
import template from 'lodash/template'
import uniq from 'lodash/uniq'
import cloneDeep from 'lodash/cloneDeep'

export default {
  components: {
    GTicket,
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
    tickets () {
      return this.ticketsByProjectAndName({
        projectName: this.shootProjectName,
        name: this.shootName,
      })
    },
    gitHubRepoUrl () {
      return get(this.ticketConfig, ['gitHubRepoUrl'])
    },
    shootUrl () {
      const url = new URL(`/namespace/${this.shootNamespace}/shoots/${this.shootName}`, window.location)
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

<style lang="scss" scoped>
  .link-icon {
    font-size: 1.2em;
    text-decoration: none;
  }
</style>
