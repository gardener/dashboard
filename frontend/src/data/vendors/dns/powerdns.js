export default {
  name: 'powerdns',
  displayName: 'PowerDNS',
  weight: 10400,
  icon: 'powerdns.svg',
  secret: {
    details: [
      {
        label: 'Server',
        valueFrom: {
          key: ['server'],
        },
      },
      {
        label: 'API Key',
        hidden: true,
      },
    ],
  },
}
