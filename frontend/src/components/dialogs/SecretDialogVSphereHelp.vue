<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About VMware vSphere Secrets"
    color="indigo darken-4"
    backgroundSrc="/static/background_vsphere.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          Before you can provision and access a Kubernetes cluster on VMware vSphere, you need to add vSphere and NSX-T account credentials.
          The Gardener needs these credentials to provision and operate the VMware vSphere infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Ensure that these accounts have privileges to <b>create, modify and delete VMs and Networking resources</b>.
        </p>
        <p>
          Please read the
          <a href="https://docs.vmware.com/de/VMware-vSphere/index.html"
            target="_blank"
            class="indigo--text text--darken-4">
            VMware vSphere Documentation</a>
            and the
          <a href="https://docs.vmware.com/en/VMware-NSX-T-Data-Center/index.html"
            target="_blank"
            class="indigo--text text--darken-4">
          VMware NSX-T Data Center Documentation</a>.
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
