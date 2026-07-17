export default {
  name: 'cloudflare-dns',
  displayName: 'Cloudflare DNS',
  weight: 10100,
  icon: 'cloudflare-dns.svg',
  secret: {
    details: [
      {
        label: 'API Key',
        hidden: true,
      },
    ],
  },
}
