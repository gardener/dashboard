<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
      <v-card-title class="subheading white--text cyan darken-2 mt-3 journalTitle">
        Journal
      </v-card-title>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat class="action-button cyan--text text--darken-2" :href="createJournalLink" target="_blank" title="Create Journal">
          Create Journal
          <v-icon color="cyan darken-2" class="link-icon pl-2">mdi-open-in-new</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </div>

</template>

<script>
import get from 'lodash/get'
import forEach from 'lodash/forEach'
import { mapState } from 'vuex'
import Journal from '@/components/Journal'
import { getDateFormatted, getCloudProviderKind, canLinkToSeed } from '@/utils'

export default {
  components: {
    Journal
  },
  props: {
    journals: {
      type: Array
    },
    shoot: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    getCloudProviderKind () {
      return getCloudProviderKind(get(this.shoot, 'spec.cloud'))
    },
    region () {
      return get(this.shoot, 'spec.cloud.region')
    },
    errorConditions () {
      let errorConditions = ''
      forEach(get(this.shoot, 'status.conditions'), condition => {
        errorConditions = `${errorConditions}\n**${condition.type}:** ${condition.message}`
      })
      return errorConditions
    },
    gitHubRepoUrl () {
      return this.cfg.gitHubRepoUrl
    },
    namespace () {
      return get(this.shoot, 'metadata.namespace')
    },
    canLinkToSeed () {
      return canLinkToSeed({ shootNamespace: this.namespace })
    },
    createJournalLink () {
      const name = get(this.shoot, 'metadata.name')

      const url = `${window.location.origin}/namespace/${this.namespace}/shoots/${name}`

      const dashboardShootLink = `**Shoot:** [${this.namespace}/${name}](${url})`
      const kind = `**Kind:** ${this.getCloudProviderKind} / ${this.region}`

      const seedName = get(this.shoot, 'spec.cloud.seed')
      const seedLinkOrName = this.canLinkToSeed ? `[${seedName}](${window.location.origin}/namespace/garden/shoots/${seedName})` : seedName
      const seed = `**Seed:** ${seedLinkOrName}`

      const createdAt = `**Created At:** ${getDateFormatted(get(this.shoot, 'metadata.creationTimestamp', ''))}`
      const lastOperation = `**Last Op:** ${get(this.shoot, 'status.lastOperation.description', '')}`
      const lastError = `**Last Error:** ${get(this.shoot, 'status.lastError.description', '-')}`

      const journalTitle = encodeURIComponent(`[${this.namespace}/${name}]`)
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

<style lang="styl" scoped>

  .journalTitle {
    line-height: 10px;
  }

  .link-icon {
    font-size: 120%;
    text-decoration: none;
  }
</style>
