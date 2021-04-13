constraints_min_version(1).

% This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
    workspace_has_dependency(OtherWorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType2),
    DependencyRange \= DependencyRange2,
    \+ (
      (WorkspaceCwd = 'frontend'; OtherWorkspaceCwd = 'frontend'),
      member(DependencyIdent, ['eslint'])
    ).

% This rule will enforce that all packages must have a "Apache-2.0" license field
gen_enforced_field(WorkspaceCwd, 'license', 'Apache-2.0').

% This rule will enforce that all packages must have certain engines fields
gen_enforced_field(WorkspaceCwd, 'engines.node', '^15.11.0').
gen_enforced_field(WorkspaceCwd, 'engines.yarn', '^2.4.1').

% Required to make the package work with the GitHub Package Registry
gen_enforced_field(WorkspaceCwd, 'repository.type', 'git').
gen_enforced_field(WorkspaceCwd, 'repository.url', 'git+https://github.com/gardener/dashboard.git').
gen_enforced_field(WorkspaceCwd, 'repository.directory', WorkspaceCwd).