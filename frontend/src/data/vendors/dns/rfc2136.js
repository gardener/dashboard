export default {
  name: 'rfc2136',
  displayName: 'Dynamic DNS (RFC2136)',
  weight: 10500,
  icon: 'rfc2136.svg',
  secret: {
    details: [
      {
        label: 'Server',
        key: ['Server', 'server'],
      },
      {
        label: 'TSIG Key Name',
        key: ['TSIGKeyName', 'tsigKeyName'],
      },
      {
        label: 'Zone',
        key: ['Zone', 'zone'],
      },
    ],
  },
}
