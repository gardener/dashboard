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
import compact from 'lodash/compact'
import { mapState } from 'vuex'
import Ticket from '@/components/ShootTickets/Ticket'
import { canLinkToSeed } from '@/utils'
import { shootItem } from '@/mixins/shootItem'

function code (value) {
  return '` ' + value + ' `'
}

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
    errorConditions () {
      const errorConditions = map(this.shootConditions, ({ type, message }) => `**${type}:** ${code(message)}`)
      return join(errorConditions, '\n')
    },
    gitHubRepoUrl () {
      return get(this.cfg, 'ticket.gitHubRepoUrl')
    },
    canLinkToSeed () {
      return canLinkToSeed({ namespace: this.shootNamespace, seedName: this.shootSeedName })
    },
    createTicketLink () {
      const url = `${window.location.origin}/namespace/${this.shootNamespace}/shoots/${this.shootName}`

      const dashboardShootLink = `**Shoot:** [${this.shootProjectName}/${this.shootName}](${url})`
      const kind = `**Kind:** ${this.shootCloudProviderKind} / ${this.shootRegion}`

      const seedLinkOrName = this.canLinkToSeed ? `[${this.shootSeedName}](${window.location.origin}/namespace/garden/shoots/${this.shootSeedName})` : this.shootSeedName
      const seed = `**Seed:** ${seedLinkOrName}`

      const createdAt = `**Created At:** ${this.shootCreatedAt}`
      const lastOperation = `**Last Operation:** ${code(get(this.shootLastOperation, 'description', ''))}`
      let shootLastErrorDescriptions = compact(map(this.shootLastErrors, 'description'))
      shootLastErrorDescriptions = map(shootLastErrorDescriptions, code)
      shootLastErrorDescriptions = join(shootLastErrorDescriptions, '\n')
      const lastError = `**Last Errors:** ${shootLastErrorDescriptions || '-'}`

      const ticketTitle = encodeURIComponent(`[${this.shootProjectName}/${this.shootName}]`)
      const body = encodeURIComponent(`
${dashboardShootLink}
${kind}
${seed}
${createdAt}
${lastOperation}
${lastError}
${this.errorConditions}`)

      return `${this.gitHubRepoUrl}/issues/new?title=${ticketTitle}&body=${body}`
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
