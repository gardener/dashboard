<!--
Copyright 2018 by The Gardener Authors.

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
    <v-card-title class="subheading white--text cyan darken-2 mt-3 journalTitle">
      Journal {{journalTitle}} <journal-labels :labels="journal.data.labels"></journal-labels>
    </v-card-title>

    <v-container>
      <span style="font-weight: 700">{{login}}</span> created this
      <a :href="htmlUrl" target="_blank">journal</a>
      <a :href="htmlUrl" target="_blank" class="link-icon"><v-icon color="cyan darken-2" class="link-icon">mdi-open-in-new</v-icon></a>
      <time-ago :dateTime="journal.metadata.created_at"></time-ago>
    </v-list-tile-title>
    </v-container>
    <v-container grid-list-md>
      <journal-comment :comment="journal"></journal-comment>
      <span v-for="comment in commentsForJournal" :key="comment.metadata.id">
        <journal-comment :comment="comment"></journal-comment>
      </span>
    </v-container>
    <v-card-actions v-if="!!gitHubRepoUrl">
      <v-spacer></v-spacer>
      <v-btn flat class="action-button cyan--text text--darken-2" :href="addCommentLink" target="_blank" title="Add Comment">
        Add Comment
        <v-icon color="cyan darken-2" class="link-icon pl-2">mdi-open-in-new</v-icon>
      </v-btn>
      <v-spacer></v-spacer>
    </v-card-actions>
  </div>
</template>



<script>
  import get from 'lodash/get'
  import { mapState, mapGetters } from 'vuex'
  import TimeAgo from '@/components/TimeAgo'
  import JournalLabels from '@/components/JournalLabels'
  import JournalComment from '@/components/JournalComment'

  export default {
    components: {
      TimeAgo,
      JournalLabels,
      JournalComment
    },
    props: {
      journal: {
        type: Object,
        required: true
      }
    },
    computed: {
      ...mapState([
        'cfg'
      ]),
      ...mapGetters([
        'journalCommentsByIssueNumber'
      ]),
      journalTitle () {
        const title = get(this.journal, 'metadata.journalTitle')
        return title ? ` - ${title}` : ''
      },
      login () {
        return get(this.journal, 'data.user.login')
      },
      htmlUrl () {
        return get(this.journal, 'data.html_url')
      },
      commentsForJournal () {
        const issueNumber = get(this.journal, 'metadata.number')
        return this.journalCommentsByIssueNumber({issueNumber})
      },
      gitHubRepoUrl () {
        return this.cfg.gitHubRepoUrl
      },
      addCommentLink () {
        const issueNumber = get(this.journal, 'metadata.number')
        return `${this.gitHubRepoUrl}/issues/${issueNumber}#new_comment_field`
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