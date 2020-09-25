<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About OpenStack Secrets"
    color="black"
    backgroundSrc="/static/background_openstack.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          Before you can provision and access a Kubernetes cluster on OpenStack, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the OpenStack infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the user has privileges to <b>create, modify and delete VMs</b>.
        </p>
        <p>
          Read the
          <a href="https://docs.openstack.org/horizon/latest/admin/admin-manage-roles.html"
            target="_blank"
            class="black--text">
            OpenStack help section<v-icon style="font-size: 80%">mdi-open-in-new</v-icon></a> on how to create and manage roles.
        </p>
      </div>
    </template>
  </secret-dialog-help>
</template>

<script>
import SecretDialogHelp from '@/components/dialogs/SecretDialogHelp'

export default {
  components: {
    SecretDialogHelp
  },
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    }
  }
}
</script>
