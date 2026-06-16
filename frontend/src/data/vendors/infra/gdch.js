export const serviceIdentityDetail = {
  label: 'Service Identity',
  valueFrom: {
    key: ['serviceaccount.json'],
    parse: 'json',
    path: ['name'],
  },
}

export const serviceIdentityField = {
  key: 'serviceaccount.json',
  label: 'Service Identity Key',
  hint: 'Enter or drop the GDC service identity JSON key',
  type: 'json',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
    isJSON: {
      type: 'isValidObject',
      message: 'Not a valid JSON',
    },
    project: {
      type: 'hasObjectProp',
      key: 'project',
    },
    type: {
      type: 'hasObjectProp',
      key: 'type',
      value: 'gdch_service_account',
    },
    privateKeyID: {
      type: 'hasObjectProp',
      key: 'private_key_id',
    },
    privateKey: {
      type: 'hasObjectProp',
      key: 'private_key',
    },
  },
}

export default {
  name: 'gdch',
  displayName: 'Google Distributed Cloud air-gapped',
  weight: 1300,
  icon: 'gdch.svg',
  secret: {
    details: [
      serviceIdentityDetail,
    ],
    fields: [
      serviceIdentityField,
    ],
    help: `
      <p>
        Google Distributed Cloud air-gapped (GDC-A) uses <em>service identities</em> to authenticate
        Gardener against your GDC project. Create a service identity in the GDC console under
        <strong>Identity &amp; Access → Service Identities</strong>, then create a JSON key — that is
        the file you enter here.
      </p>
      <p>Assign at least the following roles to the service identity in your GDC project:</p>
      <ul style="margin-left: 20px;">
        <li>Backend Service Policy Admin</li>
        <li>Cloud NAT Developer</li>
        <li>Gardener CSI Manager</li>
        <li>Load Balancer Admin</li>
        <li>Project Network Policy Admin</li>
        <li>Project VirtualMachine Admin</li>
        <li>Secret Admin</li>
        <li>Subnet Project Admin</li>
      </ul>
      <p>
        <strong>Important:</strong> disable <em>Data Exfiltration Protection</em> on your GDC project
        before creating shoots. Without this, nodes silently fail to join the cluster.
      </p>
    `,
  },
}
