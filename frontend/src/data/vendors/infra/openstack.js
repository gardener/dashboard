export const authUrlField = {
  key: 'authURL',
  label: 'Auth URL',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const domainNameField = {
  key: 'domainName',
  label: 'Domain Name',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const tenantNameField = {
  key: 'tenantName',
  label: 'Project / Tenant Name',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const applicationCredentialIdField = {
  key: 'applicationCredentialID',
  label: 'ID',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const applicationCredentialNameField = {
  key: 'applicationCredentialName',
  label: 'Name',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const applicationCredentialSecretField = {
  key: 'applicationCredentialSecret',
  label: 'Secret',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const usernameField = {
  key: 'username',
  label: 'Technical User',
  type: 'text',
  hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const passwordField = {
  key: 'password',
  label: 'Password',
  type: 'text',
  sensitive: true,
  hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
  validators: {
    required: {
      type: 'required',
    },
  },
}

export default {
  name: 'openstack',
  displayName: 'OpenStack',
  weight: 400,
  icon: 'openstack.svg',
  secret: {
    details: [
      {
        label: 'Domain Name',
        valueFrom: {
          key: ['domainName'],
        },
      },
      {
        label: 'Tenant Name',
        valueFrom: {
          key: ['tenantName'],
        },
      },
    ],
    fields: [
      authUrlField,
      domainNameField,
      tenantNameField,
      applicationCredentialIdField,
      applicationCredentialNameField,
      applicationCredentialSecretField,
      usernameField,
      passwordField,
    ],
  },
}
