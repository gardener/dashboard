export default {
  name: 'stackit-dns',
  displayName: 'STACKIT DNS',
  weight: 1100,
  icon: 'stackit.svg',
  secret: {
    details: [
      {
        label: 'Project ID',
        valueFrom: {
          key: ['project-id'],
        },
      },
    ],
  },
}
