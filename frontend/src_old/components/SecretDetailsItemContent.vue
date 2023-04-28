<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list-item-content class="pa-0">
    <v-list-item-subtitle>
      <span v-if="detailsTitle">Credential Details (</span>
      <span v-for="({ label }, index) in secretDetails" :key="label">
        <span>{{ label }}</span>
        <span v-if="index !== secretDetails.length - 1"> / </span>
      </span>
      <span v-if="detailsTitle">)</span>
    </v-list-item-subtitle>
    <v-list-item-title>
      <span v-for="({ value, label }, index) in secretDetails" :key="label">
        <span v-if="value">{{ value }}</span>
        <span v-else class="font-weight-light text--disabled">unknown</span>
        <span v-if="index !== secretDetails.length - 1"> / </span>
      </span>
    </v-list-item-title>
  </v-list-item-content>
</template>

<script>

export default {
  props: {
    infra: {
      type: Boolean,
      default: false
    },
    dns: {
      type: Boolean,
      default: false
    },
    secret: {
      type: Object
    },
    detailsTitle: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    secretDetails () {
      if (!this.secret) {
        return undefined
      }
      if (this.infra) {
        return this.getSecretDetailsInfra(this.secret)
      }
      if (this.dns) {
        return this.getSecretDetailsDns(this.secret)
      }
      return undefined
    }
  },
  methods: {
    getSecretDetailsInfra (secret) {
      const secretData = secret.data || {}
      switch (secret.metadata.cloudProviderKind) {
        case 'openstack':
          return [
            {
              label: 'Domain Name',
              value: secretData.domainName
            },
            {
              label: 'Tenant Name',
              value: secretData.tenantName
            }
          ]
        case 'vsphere':
          return [
            {
              label: 'vSphere Username',
              value: secretData.vsphereUsername
            },
            {
              label: 'NSX-T Username',
              value: secretData.nsxtUsername
            }
          ]
        case 'aws':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
        case 'azure':
          return [
            {
              label: 'Subscription ID',
              value: secretData.subscriptionID
            }
          ]
        case 'gcp':
          return [
            {
              label: 'Project',
              value: secretData.project
            }
          ]
        case 'alicloud':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
        case 'metal':
          return [
            {
              label: 'API URL',
              value: secretData.metalAPIURL
            }
          ]
        case 'hcloud':
          return [
            {
              label: 'Hetzner Cloud Token',
              value: secretData.hcloudToken
            }
          ]
        default:
          return [
            {
              label: 'Secret Data',
              value: JSON.stringify(secretData)
            }
          ]
      }
    },
    getSecretDetailsDns (secret) {
      const secretData = secret.data || {}
      switch (secret.metadata.dnsProviderName) {
        case 'openstack-designate':
          return [
            {
              label: 'Domain Name',
              value: secretData.domainName
            },
            {
              label: 'Tenant Name',
              value: secretData.tenantName
            }
          ]
        case 'aws-route53':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
        case 'azure-dns':
        case 'azure-private-dns':
          return [
            {
              label: 'Subscription ID',
              value: secretData.subscriptionID
            }
          ]
        case 'google-clouddns':
          return [
            {
              label: 'Project',
              value: secretData.project
            }
          ]
        case 'alicloud-dns':
          return [
            {
              label: 'Access Key ID',
              value: secretData.accessKeyID
            }
          ]
        case 'infoblox-dns':
          return [
            {
              label: 'Infoblox Username',
              value: secretData.USERNAME
            }
          ]
        case 'cloudflare-dns':
          return [
            {
              label: 'API Key',
              value: 'hidden'
            }
          ]
        case 'netlify-dns':
          return [
            {
              label: 'API Key',
              value: 'hidden'
            }
          ]
        default:
          return [
            {
              label: 'Secret Data',
              value: JSON.stringify(secretData)
            }
          ]
      }
    }
  }
}
</script>
