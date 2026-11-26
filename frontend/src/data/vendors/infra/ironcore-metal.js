export default {
  name: 'ironcore-metal',
  displayName: 'IronCore Metal',
  weight: 950,
  icon: 'ironcore.svg',
  workloadIdentity: {
    targetSystemType: 'ironcore-metal',
    omitProviderConfig: true,
    details: [{
      label: 'Audience',
      valueFrom: { key: ['spec', 'audiences'] },
    }],
    help: `
      <p>Enter the audience accepted by your landscape's Metal API authentication configuration. Gardener-issued tokens will be used to access the IronCore Metal API.</p>
      <p>Your operator must configure trust and permissions, the CloudProfile region endpoint and CA, and the extension's Metal namespace. No namespace, username, static token or kubeconfig is required here.</p>
    `,
  },
}
