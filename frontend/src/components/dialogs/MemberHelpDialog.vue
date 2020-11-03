<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card :class="cardClass">
      <v-card-title class="dialog-title white--text align-center justify-start">
        <v-icon large dark>mdi-account-plus</v-icon>
        <span class="headline ml-5">{{ title}}</span>
      </v-card-title>
      <v-card-text>
        <template v-if="isUserDialog">
          <div class="title grey--text text--darken-1 my-4">Add users to your project.</div>
          <p class="body-1">
            Adding users to your project allows you to collaborate across your team.
            Access to resources within your project can be configured by assigning roles.
          </p>
        </template>
        <template v-if="isServiceDialog">
          <div class="title grey--text text--darken-1 my-4">Add service accounts to your project.</div>
          <p class="body-1">
            Adding service accounts to your project allows you to automate processes in your project.
            Access to resources within your project can be configured by assigning roles.
          </p>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.stop="hide" :class="buttonClass" tabindex="2">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'help-member-dialog',
  props: {
    value: {
      type: Boolean,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  },
  computed: {
    visible: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    title () {
      return this.isUserDialog ? 'Project Users' : 'Service Accounts'
    },
    isUserDialog () {
      return this.type === 'user'
    },
    isServiceDialog () {
      return this.type === 'service'
    },
    cardClass () {
      if (this.isUserDialog) {
        return 'help_user'
      } else if (this.isServiceDialog) {
        return 'help_service'
      }
      return ''
    },
    buttonClass () {
      if (this.isUserDialog) {
        return 'green--text darken-2'
      } else if (this.isServiceDialog) {
        return 'blue-grey--text'
      }
      return ''
    }
  },
  methods: {
    hide () {
      this.visible = false
    }
  }
}
</script>

<style lang="scss" scoped>
  .help_user, .help_service {
    .dialog-title {
      background-size: cover;
      height: 130px;
    }
  }
  .help_user {
    .dialog-title {
      background-image: url('../../assets/add_user_background.svg');
    }
  }
  .help_service {
    .dialog-title {
      background-image: url('../../assets/add_service_background.svg');
    }
  }
</style>
