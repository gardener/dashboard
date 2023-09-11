/**
 * SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
 *
 * SPDX-License-Identifier: Apache-2.0
 */
constraints_min_version(1).

% This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
    workspace_has_dependency(OtherWorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType2),
    DependencyRange \= DependencyRange2.

% This rule will enforce that all workspace dependencies are made explicit
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, 'workspace:*', DependencyType) :-
  workspace_ident(_, DependencyIdent),
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, DependencyType).

% This rule will enforce that all packages must have a "Apache-2.0" license field
gen_enforced_field(WorkspaceCwd, 'license', 'Apache-2.0').

% This rule will enforce that all packages must have certain engines fields
gen_enforced_field(WorkspaceCwd, 'engines.node', '^20.5.0').
gen_enforced_field(WorkspaceCwd, 'packageManager', 'yarn@3.6.3').

% Required to make the package work with the GitHub Package Registry
gen_enforced_field(WorkspaceCwd, 'repository.type', 'git').
gen_enforced_field(WorkspaceCwd, 'repository.url', 'git+https://github.com/gardener/dashboard.git').
gen_enforced_field(WorkspaceCwd, 'repository.directory', WorkspaceCwd).
