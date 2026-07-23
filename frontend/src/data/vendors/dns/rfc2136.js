export default {
  name: 'rfc2136',
  displayName: 'Dynamic DNS (RFC2136)',
  weight: 10500,
  icon: 'rfc2136.svg',
  secret: {
    details: [
      {
        label: 'Server',
        valueFrom: {
          keys: [
            ['Server'],
            ['server'],
          ],
        },
      },
      {
        label: 'TSIG Key Name',
        valueFrom: {
          keys: [
            ['TSIGKeyName'],
            ['tsigKeyName'],
          ],
        },
      },
      {
        label: 'Zone',
        valueFrom: {
          keys: [
            ['Zone'],
            ['zone'],
          ],
        },
      },
    ],
  },
}
