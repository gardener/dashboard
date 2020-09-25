# SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

REGISTRY     := eu.gcr.io/gardener-project
ORGANIZATION := gardener
PROJECT      := dashboard
IMAGE        := $(REGISTRY)/$(ORGANIZATION)/$(PROJECT)
TAG          := $(shell cat ./VERSION)-$(shell ./scripts/git-version)

.PHONY: build
build:
	@docker build -t $(IMAGE):$(TAG) --rm .

.PHONY: push
push:
	@if ! gcloud config configurations list | tail -n +2 | awk '{ print $$1 }' | grep -q -F "gardener"; then echo "Activation of gcloud configuration \"gardener\" failed"; false; fi
	@gcloud config configurations activate gardener
	@if ! docker images $(IMAGE) | tail -n +2 | awk '{ print $$2 }' | grep -q -F "$(TAG)"; then echo "Dashboard image \"$(TAG)\" not found. Please run 'make build'"; false; fi
	@docker push $(IMAGE):$(TAG)

.PHONY: release
release: build push
