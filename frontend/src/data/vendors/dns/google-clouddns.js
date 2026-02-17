//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import gcp from '../infra/gcp'

export default {
  name: 'google-clouddns',
  displayName: 'Google Cloud DNS',
  weight: 400,
  icon: 'google-clouddns.svg',
  secret: {
    fields: gcp.secret.fields,
    help: `
      <p>
          You need to provide a service account and a key (serviceaccount.json) to allow the dns-controller-manager to authenticate and execute calls to Cloud DNS.
        </p>
        <p>
          For details on Cloud DNS see
          <a href=="https://cloud.google.com/dns/docs/zones">Cloud DNS documentation</a>,
          and on Service Accounts see
          <a href="https://cloud.google.com/iam/docs/service-accounts">Service Account documentation</a>.
        </p>
        <p>
          The service account needs permissions on the hosted zone to list and change DNS records. For details on which permissions or roles are required see
          <a href="https://cloud.google.com/dns/docs/access-control">Access Control documentation</a>.
          A possible role is roles/dns.admin "DNS Administrator".
        </p>
      `,
  },
}
