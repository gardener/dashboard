export default {
  name: 'metal',
  displayName: 'metal-stack',
  weight: 600,
  icon: 'metal.svg',
  secret: {
    details: [
      {
        label: 'API URL',
        valueFrom: {
          key: ['metalAPIURL'],
        },
      },
    ],
    fields: [
      {
        key: 'metalAPIURL',
        label: 'API URL',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          url: {
            type: 'url',
          },
        },
      },
      {
        key: 'metalAPIHMac',
        label: 'API HMAC',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on Metal Stack, you need to provide HMAC credentials and the endpoint of your Metal API.
        The Gardener needs the credentials to provision and operate the Metal Stack infrastructure for your Kubernetes cluster.
      </p>
      `,
  },
}
