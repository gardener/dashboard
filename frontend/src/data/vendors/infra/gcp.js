export default {
  name: 'gcp',
  displayName: 'Google Cloud',
  weight: 300,
  icon: 'gcp.svg',
  secret: {
    details: [
      {
        label: 'Project',
        valueFrom: {
          key: ['serviceaccount.json'],
          parse: 'json',
          path: ['project_id'],
        },
      },
    ],
  },
}
