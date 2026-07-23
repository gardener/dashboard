export default {
  name: 'netlify-dns',
  displayName: 'Netlify DNS',
  weight: 10300,
  icon: 'netlify-dns.svg',
  secret: {
    details: [
      {
        label: 'API Key',
        hidden: true,
      },
    ],
  },
}
