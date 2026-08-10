import {
  projectIdDetail,
  projectIdField,
  serviceAccountField,
} from '../infra/stackit'

export default {
  name: 'stackit-dns',
  displayName: 'STACKIT DNS',
  weight: 1100,
  icon: 'stackit.svg',
  secret: {
    details: [
      projectIdDetail,
    ],
    fields: [
      projectIdField,
      serviceAccountField,
    ],
  },
}
