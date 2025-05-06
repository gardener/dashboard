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
          v-for="({ label }, index) in credentialDetails"
          :key="label"
        >
          <span>{{ label }}</span>
          <span v-if="index !== credentialDetails.length - 1"> / </span>
        </span>
        <span v-if="detailsTitle">)</span>
      </template>
      <span
        v-for="({ value, label, valueClass }, index) in credentialDetails"
        :key="label"
      >
        <span
          v-if="value"
          :class="valueClass"
        >{{ value }}</span>
        <span
          v-else
          class="font-weight-light text-disabled"
        >unknown</span>
        <span v-if="index !== credentialDetails.length - 1"> / </span>
      </span>
    </g-list-item-content>
  </div>
</template>

<script>
import { decodeBase64 } from '@/utils'

import get from 'lodash/get'

export default {

  props: {
    credential: {
      type: Object,
    },
    shared: {
      type: Boolean,
      default: false,
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
    credentialDetails () {
      if (this.shared) {
        return [
          {
            label: 'Shared',
            value: 'Details not available for shared credentials',
            valueClass: 'font-weight-light text-disabled',
          },
        ]
      }
      if (this.credential?.kind === 'Secret') {
        const details = this.getCredentialDetails(this.credential)
        if (details) {
          return details
        }
      }
      if (this.credential?.kind === 'WorkloadIdentity') {
        return [
          {
            label: 'WorkloadIdentity',
            value: 'Details not available for credentials of type WorkloadIdentity',
            valueClass: 'font-weight-light text-disabled',
          },
        ]
      }
      return [
        {
          label: this.credential?.kind || 'Unknown',
          value: `No details available for credentials of type ${this.providerType}`,
          valueClass: 'font-weight-light text-disabled',
        },
      ]
    },
  },
  methods: {
    getCredentialDetails (secret) {
      const secretData = secret.data || {}
      const getGCPProjectId = () => {
        const serviceAccount = get(secretData, ['serviceaccount.json'])
        return get(JSON.parse(decodeBase64(serviceAccount)), ['project_id'])
      }
      try {
        switch (this.providerType) {
          // infra
          case 'openstack':
            return [
              {
                label: 'Domain Name',
                value: decodeBase64(secretData.domainName),
              },
              {
                label: 'Tenant Name',
                value: decodeBase64(secretData.tenantName),
              },
            ]
          case 'vsphere':
            return [
              {
                label: 'vSphere Username',
                value: decodeBase64(secretData.vsphereUsername),
              },
              {
                label: 'NSX-T Username',
                value: decodeBase64(secretData.nsxtUsername),
              },
            ]
          case 'aws':
            return [
              {
                label: 'Access Key ID',
                value: decodeBase64(secretData.accessKeyID),
              },
            ]
          case 'azure':
            return [
              {
                label: 'Subscription ID',
                value: decodeBase64(secretData.subscriptionID),
              },
            ]
          case 'gcp':
            return [
              {
                label: 'Project',
                value: getGCPProjectId(),
              },
            ]
          case 'alicloud':
            return [
              {
                label: 'Access Key ID',
                value: decodeBase64(secretData.accessKeyID),
              },
            ]
          case 'metal':
            return [
              {
                label: 'API URL',
                value: decodeBase64(secretData.metalAPIURL),
              },
            ]
          case 'hcloud':
            return [
              {
                label: 'Hetzner Cloud Token',
                value: 'hidden',
              },
            ]
          case 'openstack-designate':
            return [
              {
                label: 'Domain Name',
                value: decodeBase64(secretData.domainName),
              },
              {
                label: 'Tenant Name',
                value: decodeBase64(secretData.tenantName),
              },
            ]
          // dns
          case 'aws-route53':
            return [
              {
                label: 'Access Key ID',
                value: decodeBase64(secretData.accessKeyID),
              },
            ]
          case 'azure-dns':
          case 'azure-private-dns':
            return [
              {
                label: 'Subscription ID',
                value: decodeBase64(secretData.subscriptionID),
              },
            ]
          case 'google-clouddns':
            return [
              {
                label: 'Project',
                value: decodeBase64(secretData.project),
              },
            ]
          case 'alicloud-dns':
            return [
              {
                label: 'Access Key ID',
                value: decodeBase64(secretData.accessKeyID),
              },
            ]
          case 'infoblox-dns':
            return [
              {
                label: 'Infoblox Username',
                value: decodeBase64(secretData.USERNAME),
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
                value: decodeBase64(secretData.Server),
              },
              {
                label: 'TSIG Key Name',
                value: decodeBase64(secretData.TSIGKeyName),
              },
              {
                label: 'Zone',
                value: decodeBase64(secretData.Zone),
              },
            ]
          case 'powerdns':
            return [
              {
                label: 'Server',
                value: decodeBase64(secretData.server),
              },
              {
                label: 'API Key',
                value: 'hidden',
              },
            ]
          default:
            return undefined
        }
      } catch (err) {
        return undefined
      }
    },
  },
}
</script>
