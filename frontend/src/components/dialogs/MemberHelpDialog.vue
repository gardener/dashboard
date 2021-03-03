<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card :class="cardClass">
      <v-card-title class="toolbar-background">
        <v-icon large class="toolbar-title--text">mdi-account-plus</v-icon>
        <span class="headline ml-5 toolbar-title--text">{{ title}}</span>
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
         <div class="title grey--text text--darken-1 my-4">Assign roles to your members.</div>
          <p class="body-1">
            Add roles to your members to restrict access to resources of this project. Currently supported built-in roles are:
            <ul>
              <li>
                <code>owner</code> - Access to all resources and ability to manage members. Currently there can only be one owner per project. You can change the owner on the project administration page.
              </li>
              <li>
                <code>admin</code> - Access to all resources of this project, except for member management.
              </li>
              <li>
                <code>viewer</code> - Read access to project details and shoots. Has access to shoots but is not able to create new ones. Cannot read infrastructure secrets.
              </li>
              <li>
                <code>UAM</code> - Give the member User Access Management rights. Members with this role can manage members, should be used in combination with admin role to extend rights. In case an external UAM system is connected via a service account, only this account should get the <code>UAM</code> role.
              </li>
            </ul>
          </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click.stop="hide" class="primary--text" tabindex="2">Ok</v-btn>
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
    }
  },
  methods: {
    hide () {
      this.visible = false
    }
  }
}
</script>
