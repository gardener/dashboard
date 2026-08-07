import azureDns from './azure-dns'

export default {
  name: 'azure-private-dns',
  displayName: 'Azure Private DNS',
  weight: 300,
  icon: 'azure-dns.svg',
  secret: azureDns.secret,
}
