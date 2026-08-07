export default {
  name: 'aws',
  displayName: 'AWS',
  weight: 100,
  icon: 'aws.svg',
  secret: {
    details: [
      {
        label: 'Access Key ID',
        valueFrom: {
          key: ['accessKeyID'],
        },
      },
    ],
    fields: [
      {
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
      },
      {
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
      },
    ],
  },
}
