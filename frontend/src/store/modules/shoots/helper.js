//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export function keyForShoot ({ name, namespace }) {
  return `${name}_${namespace}`
}

export function findItem (state) {
  return ({ name, namespace }) => state.shoots[keyForShoot({ name, namespace })]
}
