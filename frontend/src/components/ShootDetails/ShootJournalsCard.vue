<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <div>
    <v-card v-for="journal in journals" :key="journal.metadata.issueNumber">
      <journal :journal="journal"></journal>
    </v-card>
    <v-card v-if="journals.length === 0 && !!gitHubRepoUrl">
      <v-card-title class="subtitle-1 white--text cyan darken-2 journalTitle">
        Journal
      </v-card-title>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text class="action-button cyan--text text--darken-2" :href="createJournalLink" target="_blank" title="Create Journal">
          Create Journal
          <v-icon color="cyan darken-2" class="link-icon pl-2">mdi-open-in-new</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
    <v-row v-if="journals.length && !!gitHubRepoUrl" align="center" justify="center" >
      <v-btn text class="action-button cyan--text text--darken-2 mt-4" :href="createJournalLink" target="_blank" title="Create Journal">
        Create Journal
        <v-icon color="cyan darken-2" class="link-icon pl-2">mdi-open-in-new</v-icon>
      </v-btn>
    </v-row>
  </div>

</template>

<script>
import get from 'lodash/get'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import compact from 'lodash/compact'
import { mapState } from 'vuex'
import Journal from '@/components/ShootJournals/Journal'
import { canLinkToSeed } from '@/utils'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    Journal
  },
  props: {
    journals: {
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
      let errorConditions = ''
      forEach(this.shootConditions, condition => {
        errorConditions = `${errorConditions}\n**${condition.type}:** ${condition.message}`
      })
      return errorConditions
    },
    gitHubRepoUrl () {
      return this.cfg.gitHubRepoUrl
    },
    canLinkToSeed () {
      return canLinkToSeed({ namespace: this.shootNamespace, seedName: this.shootSeedName })
    },
    createJournalLink () {
      const url = `${window.location.origin}/namespace/${this.shootNamespace}/shoots/${this.shootName}`

      const dashboardShootLink = `**Shoot:** [${this.shootNamespace}/${this.shootName}](${url})`
      const kind = `**Kind:** ${this.shootCloudProviderKind} / ${this.shootRegion}`

      const seedLinkOrName = this.canLinkToSeed ? `[${this.shootSeedName}](${window.location.origin}/namespace/garden/shoots/${this.shootSeedName})` : this.shootSeedName
      const seed = `**Seed:** ${seedLinkOrName}`

      const createdAt = `**Created At:** ${this.shootCreatedAt}`
      const lastOperation = `**Last Op:** ${get(this.shootLastOperation, 'description', '')}`
      let shootLastErrorDescriptions = compact(map(this.shootLastErrors, 'description'))
      shootLastErrorDescriptions = join(shootLastErrorDescriptions, '\n')
      const lastError = `**Last Errors:** ${shootLastErrorDescriptions || '-'}`

      const journalTitle = encodeURIComponent(`[${this.shootNamespace}/${this.shootName}]`)
      const body = encodeURIComponent(`
${dashboardShootLink}
${kind}
${seed}
${createdAt}
${lastOperation}
${lastError}
${this.errorConditions}`)

      return `${this.gitHubRepoUrl}/issues/new?title=${journalTitle}&body=${body}`
    }
  }
}
</script>

<style lang="scss" scoped>

  .journalTitle {
    line-height: 10px;
  }

  .link-icon {
    font-size: 120%;
    text-decoration: none;
  }
</style>
