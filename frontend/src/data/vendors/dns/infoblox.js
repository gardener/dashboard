export default {
  name: 'infoblox-dns',
  displayName: 'Infoblox',
  weight: 10200,
  icon: 'infoblox-dns.svg',
  secret: {
    details: [
      {
        label: 'Infoblox Username',
        valueFrom: {
          key: ['USERNAME'],
        },
      },
    ],
  },
}
