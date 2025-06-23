//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

function enforceConsistentDependencies ({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === 'peerDependencies') {
      continue
    }

    for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
      if (otherDependency.type === 'peerDependencies') {
        continue
      }

      dependency.update(otherDependency.range)
    }
  }
}

function enforceConsistentVueUseVersions({ Yarn }) {
  const vueUsePackages = Yarn.dependencies().filter(dep => dep.ident.startsWith('@vueuse/'));

  if (vueUsePackages.length > 0) {
    const firstVersion = vueUsePackages[0].range

    for (const dependency of vueUsePackages) {
      dependency.update(firstVersion)
    }
  }
}

function enforceWorkspaceDependencies({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (!Yarn.workspace({ ident: dependency.ident })) {
      continue
    }

    dependency.update('workspace:^')
  }
}

function enforceFieldsOnAllWorkspaces({ Yarn }, fields) {
  for (const workspace of Yarn.workspaces()) {
    for (const [field, value] of Object.entries(fields)) {
      workspace.set(field, typeof value === 'function' ? value(workspace) : value)
    }
  }
}

module.exports = {
  async constraints (ctx) {
    enforceConsistentDependencies(ctx)
    enforceConsistentVueUseVersions(ctx)
    enforceWorkspaceDependencies(ctx)
    enforceFieldsOnAllWorkspaces(ctx, {
      license: 'Apache-2.0',
      'engines.node': '^22.7.0',
      'packageManager': 'yarn@4.9.2',
      'repository.type': 'git',
      'repository.url': 'git+https://github.com/gardener/dashboard.git',
      'repository.directory': workspace => workspace.cwd,
    })
  }
}
