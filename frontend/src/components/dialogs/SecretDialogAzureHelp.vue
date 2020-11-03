<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About Azure Secrets"
    color="blue darken-1"
    backgroundSrc="/static/background_azure.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          Before you can provision and access a Kubernetes cluster on Azure, you need to add account credentials.
          The Gardener needs the credentials to provision and operate the Azure infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that the account has the <b>contributor</b> role.
        </p>
        <p>
          Read the
          <a href="https://docs.microsoft.com/azure/active-directory/role-based-access-control-configure"
          target="_blank"
          class="blue--text text--darken-1">
          IAM Console help section<v-icon style="font-size:80%">mdi-open-in-new</v-icon></a> on how to manage your credentials and subscriptions.
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
