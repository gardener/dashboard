export const accessKeyIdDetail = {
  label: 'Access Key ID',
  valueFrom: {
    key: ['accessKeyID'],
  },
}

export const accessKeyIdField = {
  key: 'accessKeyID',
  label: 'Access Key ID',
  hint: 'e.g. QNJebZ17v5Q7pYpP',
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
  },
}

export const accessKeySecretField = {
  key: 'accessKeySecret',
  label: 'Access Key Secret',
  hint: 'e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    minLength: {
      type: 'minLength',
      length: 30,
    },
  },
}

export default {
  name: 'alicloud',
  displayName: 'Alibaba Cloud',
  weight: 500,
  icon: 'alicloud.svg',
  secret: {
    details: [
      accessKeyIdDetail,
    ],
    fields: [
      accessKeyIdField,
      accessKeySecretField,
    ],
  },
}
