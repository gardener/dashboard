export default {
  name: 'local',
  displayName: 'Local',
  weight: 10100,
  workloadIdentity: {
    targetSystemType: 'local',
    omitProviderConfig: true,
    audiencesDefault: ['provider-local'],
    details: [{
      label: 'Audience',
      valueFrom: { key: ['spec', 'audiences'] },
    }],
    help: `
      <p>This identity is for Gardener's local development provider. The standard local setup uses the audience <code>provider-local</code>. No provider configuration is needed.</p>
      <p>Use this entry only with a compatible local Gardener setup.</p>
    `,
  },
}
