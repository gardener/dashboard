<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <g-list-item-content>
      <template #label>
        <span v-if="detailsTitle">Credential Details (</span>
        <span
          v-for="({ label }, index) in secretDetails"
          :key="label"
        >
          <span>{{ label }}</span>
          <span v-if="index !== secretDetails.length - 1"> / </span>
        </span>
        <span v-if="detailsTitle">)</span>
      </template>
      <span
        v-for="({ value, label }, index) in secretDetails"
        :key="label"
      >
        <span v-if="value">{{ value }}</span>
        <span
          v-else
          class="font-weight-light text-disabled"
        >unknown</span>
        <span v-if="index !== secretDetails.length - 1"> / </span>
      </span>
    </g-list-item-content>
  </div>
</template>

<script>
import get from 'lodash/get'

export default {

  props: {
    infra: {
      type: Boolean,
      default: false,
    },
    dns: {
      type: Boolean,
      default: false,
    },
    secret: {
      type: Object,
    },
    providerType: {
      type: String,
    },
    detailsTitle: {
      type: Boolean,
      default: false,
    },
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
    },
  },
  methods: {
    getGCPProjectId (secret) {
      try {
        const serviceAccount = get(secret.data, ['serviceaccount.json'])
        return get(JSON.parse(atob(serviceAccount)), ['project_id'])
      } catch (err) {
        return undefined
      }
    },
    getSecretDetailsInfra (secret) {
      const secretData = secret.data || {}
      try {
        switch (this.providerType) {
          case 'openstack':
            return [
              {
                label: 'Domain Name',
                value: atob(secretData.domainName),
              },
              {
                label: 'Tenant Name',
                value: atob(secretData.tenantName),
              },
            ]
          case 'vsphere':
            return [
              {
                label: 'vSphere Username',
                value: atob(secretData.vsphereUsername),
              },
              {
                label: 'NSX-T Username',
                value: atob(secretData.nsxtUsername),
              },
            ]
          case 'aws':
            return [
              {
                label: 'Access Key ID',
                value: atob(secretData.accessKeyID),
              },
            ]
          case 'azure':
            return [
              {
                label: 'Subscription ID',
                value: atob(secretData.subscriptionID),
              },
            ]
          case 'gcp':
            return [
              {
                label: 'Project',
                value: atob(this.getGCPProjectId)(secret),
              },
            ]
          case 'alicloud':
            return [
              {
                label: 'Access Key ID',
                value: atob(secretData.accessKeyID),
              },
            ]
          case 'metal':
            return [
              {
                label: 'API URL',
                value: atob(secretData.metalAPIURL),
              },
            ]
          case 'hcloud':
            return [
              {
                label: 'Hetzner Cloud Token',
                value: atob(secretData.hcloudToken),
              },
            ]
          default:
            return [
              {
                label: 'Secret Data',
                value: JSON.stringify(secretData),
              },
            ]
        }
      } catch (err) {
        return undefined
      }
    },
    getSecretDetailsDns (secret) {
      const secretData = secret.data || {}
      try {
        switch (this.providerType) {
          case 'openstack-designate':
            return [
              {
                label: 'Domain Name',
                value: atob(secretData.domainName),
              },
              {
                label: 'Tenant Name',
                value: atob(secretData.tenantName),
              },
            ]
          case 'aws-route53':
            return [
              {
                label: 'Access Key ID',
                value: atob(secretData.accessKeyID),
              },
            ]
          case 'azure-dns':
          case 'azure-private-dns':
            return [
              {
                label: 'Subscription ID',
                value: atob(secretData.subscriptionID),
              },
            ]
          case 'google-clouddns':
            return [
              {
                label: 'Project',
                value: atob(secretData.project),
              },
            ]
          case 'alicloud-dns':
            return [
              {
                label: 'Access Key ID',
                value: atob(secretData.accessKeyID),
              },
            ]
          case 'infoblox-dns':
            return [
              {
                label: 'Infoblox Username',
                value: atob(secretData.USERNAME),
              },
            ]
          case 'cloudflare-dns':
            return [
              {
                label: 'API Key',
                value: 'hidden',
              },
            ]
          case 'netlify-dns':
            return [
              {
                label: 'API Key',
                value: 'hidden',
              },
            ]
          case 'rfc2136':
            return [
              {
                label: 'Server',
                value: atob(secretData.Server),
              },
              {
                label: 'TSIG Key Name',
                value: atob(secretData.TSIGKeyName),
              },
              {
                label: 'Zone',
                value: atob(secretData.Zone),
              },
            ]
          default:
            return [
              {
                label: 'Secret Data',
                value: JSON.stringify(secretData),
              },
            ]
        }
      } catch (err) {
        return undefined
      }
    },
  },
}
</script>
