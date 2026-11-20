export const projectDetail = {
  label: 'Project',
  valueFrom: {
    key: ['serviceaccount.json'],
    parse: 'json',
    path: ['project_id'],
  },
}

export const serviceAccountField = {
  key: 'serviceaccount.json',
  label: 'Service Account Key',
  hint: 'Enter or drop a service account key in JSON format',
  type: 'json',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    isJSON: {
      type: 'isValidObject',
    },
    projectID: {
      type: 'hasObjectProp',
      key: 'project_id',
      pattern: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
    },
    type: {
      type: 'hasObjectProp',
      key: 'type',
      value: 'service_account',
    },
  },
}

export const workloadIdentityProjectField = {
  key: 'projectID',
  path: ['projectID'],
  label: 'Project ID',
  hint: 'my-gcp-project',
  type: 'text',
  immutableOnEdit: true,
  validators: {
    required: { type: 'required' },
    projectID: {
      type: 'regex',
      pattern: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
      message: 'Enter a valid Google Cloud project ID',
    },
  },
}

const GCP_CREDENTIAL_KEYS = new Set([
  'audience',
  'subject_token_type',
  'token_url',
  'type',
  'universe_domain',
  'service_account_impersonation_url',
])

export function validateGcpProviderConfig (config) {
  const credentialsConfig = config?.credentialsConfig
  if (!credentialsConfig || typeof credentialsConfig !== 'object' || Array.isArray(credentialsConfig)) {
    return ['GCP credentialsConfig must be an object']
  }
  const unknownKeys = Object.keys(credentialsConfig).filter(key => !GCP_CREDENTIAL_KEYS.has(key))
  if (unknownKeys.length) {
    return [`Remove unsupported GCP credentialsConfig keys: ${unknownKeys.join(', ')}. Gardener supplies credential_source itself.`]
  }
  const errors = []
  if (credentialsConfig.type !== 'external_account') {
    errors.push('GCP credentialsConfig.type must be external_account')
  }
  if (credentialsConfig.subject_token_type !== 'urn:ietf:params:oauth:token-type:jwt') {
    errors.push('GCP credentialsConfig.subject_token_type must be urn:ietf:params:oauth:token-type:jwt')
  }
  for (const [key, value] of [
    ['audience', credentialsConfig.audience],
    ['universe_domain', credentialsConfig.universe_domain],
    ['token_url', credentialsConfig.token_url],
  ]) {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`GCP credentialsConfig.${key} is required`)
    }
  }
  return errors
}

export const gcpWorkloadIdentityFields = [
  workloadIdentityProjectField,
  {
    key: 'credentialsAudience',
    path: ['credentialsConfig', 'audience'],
    label: 'Federation Provider Audience',
    hint: '//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/my-pool/providers/gardener',
    type: 'text',
    validators: { required: { type: 'required' } },
  },
  {
    key: 'serviceAccountImpersonationURL',
    path: ['credentialsConfig', 'service_account_impersonation_url'],
    label: 'Service Account Impersonation URL (optional)',
    hint: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/gardener@my-gcp-project.iam.gserviceaccount.com:generateAccessToken',
    type: 'text',
    omitWhenEmpty: true,
    validators: {
      httpsUrl: { type: 'httpsUrl', message: 'Enter a valid HTTPS URL' },
    },
  },
]

export const gcpWorkloadIdentity = {
  targetSystemType: 'gcp',
  validateProviderConfig: validateGcpProviderConfig,
  providerConfigDefaults: {
    apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
    kind: 'WorkloadIdentityConfig',
    credentialsConfig: {
      type: 'external_account',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      universe_domain: 'googleapis.com',
      token_url: 'https://sts.googleapis.com/v1/token',
    },
  },
  fields: gcpWorkloadIdentityFields,
  details: [{
    label: 'Project ID',
    valueFrom: { key: ['spec', 'targetSystem', 'providerConfig', 'projectID'] },
  }],
  help: `
    <p>Configure a Google Cloud Workload Identity Pool and OIDC provider that trust the Gardener workload identity issuer. Enter the Project ID and copy the federation audience from the downloaded external-account configuration.</p>
    <p>The JWT Audience above is independent of the federation provider audience. Gardener supplies the token source, so do not add <code>credential_source</code> or a private service-account key. After creation, copy the final Subject from Details to restrict trust.</p>
    <p>Service-account impersonation is optional. If used, enter its URL and grant the federated principal permission to impersonate the service account. Grant the principal or service account the infrastructure permissions described in the provider guide.</p>
    <p><a href="https://github.com/gardener/gardener-extension-provider-gcp/blob/master/docs/usage/usage.md#gcp-workload-identity-federation">GCP federation setup</a></p>
  `,
}

export default {
  name: 'gcp',
  displayName: 'Google Cloud',
  weight: 300,
  icon: 'gcp.svg',
  secret: {
    details: [
      projectDetail,
    ],
    fields: [
      serviceAccountField,
    ],
    help: `
      <p>
        A service account is a special account that can be used by services and applications running on your Google
        Compute Engine instance to interact with other Google Cloud Platform APIs. Applications can use service
        account credentials to authorize themselves to a set of APIs and perform actions within the permissions
        granted to the service account and virtual machine instance.
      </p>
      <p>
        Ensure that the service account has at least the roles below.
      </p>
      <ul>
        <li>Service Account Admin</li>
        <li>Service Account Token Creator</li>
        <li>Service Account User</li>
        <li>Compute Admin</li>
      </ul>
      <p>
        The Service Account has to be enabled for the Google Identity and Access Management API.
      </p>
      <p>
        Read the
        <a href="https://cloud.google.com/compute/docs/access/service-accounts">Service Account Documentation</a>
        on how to apply for credentials to service accounts.
      </p>
    `,
  },
  workloadIdentity: gcpWorkloadIdentity,
}
