# SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

REGISTRY                      := europe-docker.pkg.dev/gardener-project/snapshots/gardener
DASHBOARD_IMAGE_REPOSITORY    := $(REGISTRY)/dashboard
TAG                           := $(shell cat ./VERSION)-$(shell ./scripts/git-version)
PUSH_LATEST_TAG               := true

.PHONY: lint
lint: ## Run eslint against code.
	@./hack/lint.sh

.PHONY: sast
sast: ## Run eslint and output in sarif format.
	@./hack/lint.sh lint-sarif

.PHONY: test
test: ## Run tests.
	@./hack/test.sh

.PHONY: coverage
coverage: ## Run tests with coverage.
	@./hack/test.sh --coverage

.PHONY: build
build:
	@echo "Building docker images with version and tag $(TAG)"
	@docker build -t $(DASHBOARD_IMAGE_REPOSITORY):$(TAG)    -t $(DASHBOARD_IMAGE_REPOSITORY):latest    -f Dockerfile --target dashboard .

.PHONY: push
push:
	@if ! gcloud config configurations list              | tail -n +2 | awk '{ print $$1 }' | grep -q -F "gardener"; then echo "Activation of gcloud configuration \"gardener\" failed";                                    false; fi
	@if ! docker images $(DASHBOARD_IMAGE_REPOSITORY)    | tail -n +2 | awk '{ print $$2 }' | grep -q -F "$(TAG)";   then echo "$(DASHBOARD_IMAGE_REPOSITORY) version $(TAG) is not yet built. Please run 'make build'";    false; fi
	@gcloud config configurations activate gardener
	@docker push $(DASHBOARD_IMAGE_REPOSITORY):$(TAG);
	@if [[ "$(PUSH_LATEST_TAG)" == "true" ]]; then \
		docker push $(DASHBOARD_IMAGE_REPOSITORY):latest; \
	fi

.PHONY: release
release: build push
