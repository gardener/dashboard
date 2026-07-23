export default {
  name: 'google-clouddns',
  displayName: 'Google Cloud DNS',
  weight: 400,
  icon: 'google-clouddns.svg',
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
