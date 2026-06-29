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
    fields: [
      {
        key: 'Server',
        label: '<host>:<port> of the authoritative DNS server',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'TSIGKeyName',
        label: 'TSIG Key Name',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          endsWithDot: {
            type: 'regex',
            pattern: '\\.$',
            message: 'TSIG Key Name must end with a dot',
          },
        },
      },
      {
        key: 'TSIGSecret',
        label: 'TSIG Secret',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'Zone',
        label: 'Zone',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          maxLength: {
            type: 'maxLength',
            length: 255,
            message: 'Zone must be at most 255 characters long',
          },
          regex: {
            type: 'regex',
            pattern: '^[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*\\.$',
            message: 'Zone must be fully qualified',
          },
        },
      },
      {
        key: 'TSIGSecretAlgorithm',
        label: 'TSIG Secret Algorithm',
        type: 'select',
        defaultValue: 'hmac-sha256',
        values: [
          {
            title: 'HMAC-SHA256 (default)',
            value: 'hmac-sha256',
          },
          {
            title: 'HMAC-SHA224',
            value: 'hmac-sha224',
          },
          {
            title: 'HMAC-SHA384',
            value: 'hmac-sha384',
          },
          {
            title: 'HMAC-SHA512',
            value: 'hmac-sha512',
          },
          {
            title: 'HMAC-SHA1',
            value: 'hmac-sha1',
          },
          {
            title: 'HMAC-MD5',
            value: 'hmac-md5',
          },
        ],
      },
    ],
    help: `
      <p>
        This DNS provider allows you to create and manage DNS entries for authoritative DNS server supporting dynamic updates with DNS messages following
        <a href="https://datatracker.ietf.org/doc/html/rfc2136">RFC2136</a>
        (DNS Update) like knot-dns or others.
      </p>
      <p>
        The configuration is depending on the DNS server product. You need permissions for <code>update</code> and <code>transfer</code> (AXFR) actions on your zones and a TSIG secret.
      </p>
      <p>
        For details see
        <a href="https://github.com/gardener/external-dns-management/tree/master/docs/rfc2136">Gardener RFC2136 DNS Provider Documentation</a>
      </p>
      `,
  },
}
