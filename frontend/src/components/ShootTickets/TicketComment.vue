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
  <v-list-item>
    <v-list-item-avatar v-if="avatarUrl" class="align-self-start">
      <v-avatar size="40px">
        <img :src="avatarUrl" :title="login"/>
      </v-avatar>
    </v-list-item-avatar>
    <v-list-item-icon v-else class="align-self-start">
      <v-icon color="cyan darken-2">mdi-comment-outline</v-icon>
    </v-list-item-icon>
    <v-list-item-content class="comment">
      <v-list-item-title class="comment-header">
        <span class="font-weight-bold">{{login}}</span> commented <a :href="htmlUrl" target="_blank"><time-string :dateTime="createdAt" mode="past"></time-string></a>
      </v-list-item-title>
      <v-list-item-subtitle class="wrap-text comment-body" v-html="compiledMarkdown"></v-list-item-subtitle>
    </v-list-item-content>
    </v-list-item>
</template>

<script>
import get from 'lodash/get'
import { compileMarkdown, gravatarUrlIdenticon } from '@/utils'
import TimeString from '@/components/TimeString'
import { mapState } from 'vuex'

const AvatarEnum = {
  GITHUB: 'github', // default
  GRAVATAR: 'gravatar',
  NONE: 'none'
}

export default {
  components: {
    TimeString
  },
  props: {
    comment: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    compiledMarkdown () {
      return compileMarkdown(get(this.comment, 'data.body', ''))
    },
    login () {
      return get(this.comment, 'data.user.login')
    },
    createdAt () {
      return get(this.comment, 'metadata.created_at')
    },
    avatarSource () {
      return get(this.cfg, 'ticket.avatarSource', AvatarEnum.GITHUB)
    },
    avatarUrl () {
      switch (this.avatarSource) {
        case AvatarEnum.GITHUB:
          return get(this.comment, 'data.user.avatar_url')
        case AvatarEnum.GRAVATAR:
          return gravatarUrlIdenticon(this.login)
        default:
          return undefined
      }
    },
    htmlUrl () {
      return get(this.comment, 'data.html_url')
    }
  }
}
</script>

<style lang="scss" scoped>
  @import '~vuetify/src/styles/styles.sass';

  $cyan-darken-2: map-get($cyan, 'darken-1');

  .comment {
    padding: 0;
    margin-bottom: 12px;
  }
  .wrap-text {
    white-space: normal;
  }

  .comment-header {
    border-top-left-radius: 2px;
    border-top-right-radius: 2px;
    border: 0.5px;
    border-bottom: 0.5px solid$cyan-darken-2;
    background-color:$cyan-darken-2;
    color: white;

    padding-left: 8px;
    padding-right: 8px;
    padding-top: 4px;
    padding-bottom: 4px;
    margin-bottom: 0;
  }

  .comment-body {
    border: 0.5px solid$cyan-darken-2;

    padding-left: 8px;
    padding-right: 8px;
    padding-top: 4px;
    padding-bottom: 4px;

    /* not needed for chrome, but kept for firefox */
    word-wrap: break-word;
    /* does not work with firefox */
    word-break: break-word;

    ::v-deep > pre {
      overflow: auto;
    }

    ::v-deep > h1 {
      font-size: 21px;
      font-weight: 600;
    }

    ::v-deep > h2 {
      font-size: 17.5px;
      font-weight: 600;
    }

    ::v-deep > h3 {
      font-size: 14px;
      font-weight: 600;
    }

    ::v-deep > h4 {
      font-size: 12.25px;
      font-weight: 600;
    }

    ::v-deep > h5 {
      font-size: 11.9px;
      font-weight: 600;
    }

    ::v-deep > h6 {
      font-size: 11.5px;
      font-weight: 600;
    }
  }

  ::v-deep .flex {
    width: 200px;
  }

  a {
    text-decoration: none;
    color: white;
  }

  a:hover{
    text-decoration: underline;
  }
</style>
