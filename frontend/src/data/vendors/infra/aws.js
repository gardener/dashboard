export const accessKeyIdDetail = {
  label: 'Access Key ID',
  valueFrom: {
    key: ['accessKeyID'],
  },
}

export const accessKeyIdField = {
  key: 'accessKeyID',
  label: 'Access Key ID',
  hint: 'e.g. AKIAIOSFODNN7EXAMPLE',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
    minLength: {
      type: 'minLength',
      length: 16,
    },
    maxLength: {
      type: 'maxLength',
      length: 128,
    },
    alphaNumUnderscore: {
      type: 'alphaNumUnderscore',
    },
  },
}

export const secretAccessKeyField = {
  key: 'secretAccessKey',
  label: 'Secret Access Key',
  hint: 'e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    minLength: {
      type: 'minLength',
      length: 40,
    },
    base64: {
      type: 'base64',
    },
  },
}

export const workloadIdentityRoleArnField = {
  key: 'roleARN',
  path: ['roleARN'],
  label: 'IAM Role ARN',
  hint: 'arn:aws:iam::123456789012:role/gardener-workload-identity',
  type: 'text',
  validators: {
    required: { type: 'required' },
    roleARN: {
      type: 'regex',
      // This is the upstream AWS extension validation expression.
      // eslint-disable-next-line security/detect-unsafe-regex
      pattern: /^arn:aws[a-z0-9-]*:iam::\d{12}:role(\/[\w+=,.@-]+)*\/[\w+=,.@-]+$/,
      message: 'Enter a valid IAM role ARN',
    },
  },
}

export const awsWorkloadIdentity = {
  targetSystemType: 'aws',
  providerConfigDefaults: {
    apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
    kind: 'WorkloadIdentityConfig',
  },
  fields: [workloadIdentityRoleArnField],
  details: [{
    label: 'Role ARN',
    valueFrom: { key: ['spec', 'targetSystem', 'providerConfig', 'roleARN'] },
  }],
  help: `
    <p>A workload identity lets Gardener authenticate using short-lived tokens. Configure an IAM OIDC identity provider for your Gardener workload identity issuer and create a role with the permissions required by the AWS provider extension.</p>
    <p>Enter that role's ARN and an audience accepted by the OIDC provider and role trust policy. After creation, copy the complete Subject from Details, including its UID, into the role trust policy. Creating this resource does not configure AWS trust or permissions.</p>
    <p><a href="https://github.com/gardener/gardener-extension-provider-aws/blob/master/docs/usage/usage.md#aws-workload-identity-federation">AWS federation setup</a></p>
  `,
}

export default {
  name: 'aws',
  displayName: 'AWS',
  weight: 100,
  icon: 'aws.svg',
  secret: {
    details: [
      accessKeyIdDetail,
    ],
    fields: [
      accessKeyIdField,
      secretAccessKeyField,
    ],
  },
  workloadIdentity: awsWorkloadIdentity,
}
