<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex my-2 mx-4">
    <div class="mr-2">
      <g-ticket-avatar
        :login="login"
        :github-avatar-url="githubAvatarUrl"
        :alt="`avatar of github user ${login}`"
      />
    </div>
    <div class="comment d-flex flex-column flex-grow-1">
      <div class="comment-header bg-toolbar-background text-toolbar-title">
        <g-external-link
          :url="htmlUrl"
          class="inherit-color text-toolbar-title"
        >
          <span class="font-weight-bold text-toolbar-title">{{ login }}</span> commented
          <g-time-string
            :date-time="createdAt"
            mode="past"
            content-class="text-toolbar-title"
          />
        </g-external-link>
      </div>
      <!-- eslint-disable vue/no-v-html -->
      <div
        class="wrap-text comment-body"
        :class="gThemeClass"
        v-html="commentHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>
  </div>
</template>

<script>
import {
  computed,
  toRefs,
} from 'vue'
import { useTheme } from 'vuetify'

import GTimeString from '@/components/GTimeString.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GTicketAvatar from '@/components/GTicketAvatar.vue'

import { transformHtml } from '@/utils'

import get from 'lodash/get'

export default {
  components: {
    GTimeString,
    GExternalLink,
    GTicketAvatar,
  },
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
  setup (props) {
    const { comment } = toRefs(props)
    const theme = useTheme()

    const commentHtml = computed(() => {
      return transformHtml(get(comment.value, ['data', 'body'], ''))
    })

    const login = computed(() => {
      return get(comment.value, ['data', 'user', 'login'])
    })

    const createdAt = computed(() => {
      return get(comment.value, ['metadata', 'created_at'])
    })

    const githubAvatarUrl = computed(() => {
      return get(comment.value, ['data', 'user', 'avatar_url'])
    })

    const htmlUrl = computed(() => {
      return get(comment.value, ['data', 'html_url'])
    })

    const gThemeClass = computed(() => {
      return theme.current.value.dark ? 'g-theme-dark' : 'g-theme-light'
    })

    return {
      commentHtml,
      login,
      createdAt,
      githubAvatarUrl,
      htmlUrl,
      gThemeClass,
    }
  },
}
</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;
  @use 'sass:map';

  $gh-code-background-color-light: map.get(vuetify.$grey, 'lighten-3');
  $gh-code-background-color-dark: map.get(vuetify.$grey, 'darken-3');

  $gh-code-color-light: map.get(vuetify.$grey, 'darken-4');
  $gh-code-color-dark: map.get(vuetify.$grey, 'lighten-4');

  .comment {
    padding: 0;
    margin-bottom: 12px;
    overflow: hidden;
  }

  .comment-header {
    border-top-left-radius: 2px;
    border-top-right-radius: 2px;
    border: 0.5px;

    padding: 4px 8px;
    margin-bottom: 0;
  }

  .g-theme-dark {
    :deep(pre) {
      background-color: $gh-code-background-color-dark;
      & > code {
        color: $gh-code-color-dark;
      }
    }

    :deep(code) {
      color: $gh-code-color-dark;
      background-color: $gh-code-background-color-dark;
    }
  }

  .g-theme-light {
    :deep(pre) {
      background-color: $gh-code-background-color-light;
      & > code {
        color: $gh-code-color-light;
      }
    }

    :deep(code) {
      color: $gh-code-color-light;
      background-color: $gh-code-background-color-light;
    }
  }

  .comment-body {
    border: 0.5px solid;

    padding: 4px 8px;

    /* not needed for chrome, but kept for firefox */
    word-wrap: break-word;
    /* does not work with firefox */
    word-break: break-word;

    :deep(pre) {
      padding: 8px;
      border-radius: 3px;
      white-space: pre;
      overflow: auto;
      & > code {
        padding: 0;
        background-color: transparent;
        background-attachment: scroll;
        font-weight: normal;
        box-shadow: none;
        -webkit-box-shadow: none;
        &:before {
          content: none;
        }
      }
    }

    :deep(code) {
      padding: .2em .4em;
      border-radius: 3px;
      font-weight: normal;
    }

    :deep(img) {
      max-width: 100%;
    }

    :deep(> h1) {
      font-size: 21px;
      font-weight: 600;
    }

    :deep(> h2) {
      font-size: 17.5px;
      font-weight: 600;
    }

    :deep(> h3) {
      font-size: 14px;
      font-weight: 600;
    }

    :deep(> h4) {
      font-size: 12.25px;
      font-weight: 600;
    }

    :deep(> h5) {
      font-size: 11.9px;
      font-weight: 600;
    }

    :deep(> h6) {
      font-size: 11.5px;
      font-weight: 600;
    }
  }

  :deep(.flex) {
    width: 200px;
  }

  a {
    text-decoration: none;
  }

  a:hover{
    text-decoration: underline;
  }
</style>
