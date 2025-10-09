# SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

ifneq (,$(filter build push release,$(MAKECMDGOALS)))
  REGISTRY                      := europe-docker.pkg.dev/gardener-project/snapshots/gardener
  DASHBOARD_IMAGE_REPOSITORY    := $(REGISTRY)/dashboard
  TAG                           := $(shell cat ./VERSION)-$(shell ./scripts/git-version)
  PUSH_LATEST_TAG               := true
endif

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: lint
lint: ## Run eslint against code.
	@yarn workspaces foreach --all --parallel --no-private run lint

.PHONY: lint-sarif
lint-sarif: ## Run eslint and output in sarif format.
	@yarn workspaces foreach --all --parallel --no-private run lint-sarif

.PHONY: test
test: ## Run tests.
	@yarn workspaces foreach --all --parallel --no-private run test

.PHONY: test-cov
test-cov: ## Run tests with coverage.
	@yarn workspaces foreach --all --parallel --no-private run test --coverage

.PHONY: build
build: ## Build the Gardener Dashboard.
	@echo "Building docker images with version and tag $(TAG)"
	@docker build -t $(DASHBOARD_IMAGE_REPOSITORY):$(TAG)    -t $(DASHBOARD_IMAGE_REPOSITORY):latest    -f Dockerfile --target dashboard .

.PHONY: push
push: ## Push the Gardener Dashboard to the registry.
	@if ! gcloud config configurations list              | tail -n +2 | awk '{ print $$1 }' | grep -q -F "gardener"; then echo "Activation of gcloud configuration \"gardener\" failed";                                    false; fi
	@if ! docker images $(DASHBOARD_IMAGE_REPOSITORY)    | tail -n +2 | awk '{ print $$2 }' | grep -q -F "$(TAG)";   then echo "$(DASHBOARD_IMAGE_REPOSITORY) version $(TAG) is not yet built. Please run 'make build'";    false; fi
	@gcloud config configurations activate gardener
	@docker push $(DASHBOARD_IMAGE_REPOSITORY):$(TAG);
	@if [[ "$(PUSH_LATEST_TAG)" == "true" ]]; then \
		docker push $(DASHBOARD_IMAGE_REPOSITORY):latest; \
	fi

.PHONY: release
release: build push ## Build and Push the Gardener Dashboard.

.PHONY: verify
verify: ## Run verification script locally (linting, tests, dependencies).
	@echo "Running verification script"
	@./hack/verify
