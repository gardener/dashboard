# SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

REGISTRY                            := eu.gcr.io/gardener-project/gardener
DASHBOARD_IMAGE_REPOSITORY          := $(REGISTRY)/dashboard
TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY := $(REGISTRY)/terminal-bootstrap
TAG                                 := $(shell cat ./VERSION)-$(shell ./scripts/git-version)
PUSH_LATEST_TAG                     := false

.PHONY: build
build:
	@echo "Building docker images with version and tag $(TAG)"
	@docker build -t $(DASHBOARD_IMAGE_REPOSITORY):$(TAG)          -t $(DASHBOARD_IMAGE_REPOSITORY):latest          -f Dockerfile --target dashboard .
	@docker build -t $(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY):$(TAG) -t $(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY):latest -f Dockerfile --target terminal-bootstrap .

.PHONY: push
push:
	@if ! gcloud config configurations list | tail -n +2 | awk '{ print $$1 }' | grep -q -F "gardener"; then echo "Activation of gcloud configuration \"gardener\" failed"; false; fi
	@if ! docker images $(DASHBOARD_IMAGE_REPOSITORY) | tail -n +2 | awk '{ print $$2 }' | grep -q -F "$(TAG)""; then echo "$(DASHBOARD_IMAGE_REPOSITORY) version $(TAG) is not yet built. Please run 'make build'"; false; fi
	@if ! docker images $(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY) | tail -n +2 | awk '{ print $$2 }' | grep -q -F "$(TAG)"; then echo "$(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY) version $(TAG) is not yet built. Please run 'make build'"; false; fi
	@gcloud config configurations activate gardener
	@docker push $(DASHBOARD_IMAGE_REPOSITORY):$(TAG)
	@if [[ "$(PUSH_LATEST_TAG)" == "true" ]]; then docker push $(DASHBOARD_IMAGE_REPOSITORY):latest; fi
	@docker push $(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY):$(TAG)
	@if [[ "$(PUSH_LATEST_TAG)" == "true" ]]; then docker push $(TERMINAL_BOOTSTRAP_IMAGE_REPOSITORY):latest; fi

.PHONY: release
release: build push

.PHONY: check-docforge
check-docforge:
	@./.ci/check-docforge
