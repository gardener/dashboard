<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About GCP Service Accounts"
    color="green"
    backgroundSrc="/static/background_gcp.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          A service account is a special account that can be used by services and applications running on your Google
          Compute Engine instance to interact with other Google Cloud Platform APIs. Applications can use service
          account credentials to authorize themselves to a set of APIs and perform actions within the permissions
          granted to the service account and virtual machine instance.
        </p>

        <p>
          Ensure that the service account has at least the roles below.
          <ul>
            <li>Service Account Admin</li>
            <li>Service Account Token Creator</li>
            <li>Service Account User</li>
            <li>Compute Admin</li>
          </ul>

        </p>

        <p>
          The Service Account has to be enabled for the Google Identity and Access Management API.
        </p>

        <p>
          Read the
          <a href="https://cloud.google.com/compute/docs/access/service-accounts"
              target="_blank"
              class="green--text">
            Service Account Documentation<v-icon style="font-size: 80%">mdi-open-in-new</v-icon></a> on how to apply for credentials
          to service accounts.
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

<style lang="scss" scoped>
  .help-content {
    ul {
      margin-top: 20px;
      margin-bottom: 20px;
      list-style-type: none;
      border-left: 4px solid #318334 !important;
      margin-left: 20px;
      padding-left: 24px;
      li {
        font-weight: 300;
        font-size: 16px;
      }
    }
  }
</style>
