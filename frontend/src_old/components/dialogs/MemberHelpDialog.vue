<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card :class="cardClass">
      <v-card-title class="toolbar-background">
        <v-icon size="large" class="toolbar-title--text">mdi-account-plus</v-icon>
        <span class="text-h5 ml-5 toolbar-title--text">{{ title}}</span>
      </v-card-title>
      <v-card-text>
        <template v-if="isUserDialog">
          <div class="text-h6 text-grey-darken-1 my-4">Add users to your project.</div>
          <p class="text-body-1">
            Adding users to your project allows you to collaborate across your team.
            Access to resources within your project can be configured by assigning roles.
          </p>
        </template>
        <template v-if="isServiceDialog">
          <div class="text-h6 text-grey-darken-1 my-4">Add service accounts to your project.</div>
          <p class="text-body-1">
            Adding service accounts to your project allows you to automate processes in your project.
            Access to resources within your project can be configured by assigning roles.
          </p>
        </template>
         <div class="text-h6 text-grey-darken-1 my-4">Assign roles to your members.</div>
          <p class="text-body-1">
            Add roles to your members to gain access to resources of this project. Currently supported built-in roles are:
            <ul>
              <li>
                <code>Owner</code> - Combines the <code>Admin</code>, <code>UAM</code> and <code>Service Account Manager</code> roles. There can only be one owner per project. You can change the owner on the project administration page.
              </li>
              <li>
                <code>Admin</code> - This allows to manage resources inside the project (e.g. secrets, shoots, configmaps and similar) and to manage permissions for service accounts. Note that the <code>Admin</code> role has read-only access to service accounts.
              </li>
              <li>
                <code>Viewer</code> - Read access to project details and shoots. Has access to shoots but is not able to create new ones. Cannot read cloud provider secrets.
              </li>
              <li>
                <code>UAM</code> - This allows to add/modify/remove human users, service accounts or groups to/from the project member list. In case an external UAM system is connected via a service account, only this account should get the <code>UAM</code> role.
              </li>
              <li>
                <code>Service Account Manager</code> - Manage service accounts inside the project namespace and request tokens for them. The permissions of the created service accounts are instead managed by the <code>Admin</code> role. For security reasons this role should not be assigned to service accounts. In particular it should be ensured that the service account is not able to refresh service account tokens forever.
              </li>
            </ul>
          </p>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click.stop="hide" class="text-primary" tabindex="2">Ok</v-btn>
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
