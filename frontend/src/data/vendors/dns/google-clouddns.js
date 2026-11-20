import {
  projectDetail,
  serviceAccountField,
  gcpWorkloadIdentity,
} from '../infra/gcp'

export default {
  name: 'google-clouddns',
  displayName: 'Google Cloud DNS',
  weight: 400,
  icon: 'google-clouddns.svg',
  secret: {
    details: [
      projectDetail,
    ],
    fields: [
      serviceAccountField,
    ],
    help: `
      <p>
        You need to provide a service account and a key (serviceaccount.json) to allow the dns-controller-manager to authenticate and execute calls to Cloud DNS.
      </p>
      <p>
        For details on Cloud DNS see
        <a href="https://cloud.google.com/dns/docs/zones">Cloud DNS documentation</a>,
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
  workloadIdentity: {
    ...gcpWorkloadIdentity,
    help: `
      <p>Configure Google Cloud federation for the Gardener issuer and enter the project containing your DNS zones. Use a principal or service account with the required Cloud DNS permissions, such as DNS Administrator at the intended scope.</p>
      <p>Copy the federation provider audience from the external-account configuration. The JWT Audience is separate from this value. Gardener supplies the token source.</p>
      <p>Copy the final Subject from Details to restrict trust. Service-account impersonation is optional; if used, enter its URL and grant the principal permission to impersonate that account.</p>
      <p><a href="https://github.com/gardener/gardener-extension-shoot-dns-service/blob/master/docs/usage/workloadidentity/gcp.md">DNS workload identity integration</a></p>
    `,
  },
}
