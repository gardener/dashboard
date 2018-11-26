ORGANIZATION := gardener
PROJECT      := dashboard
VERSION      ?= $(shell ./scripts/git-version)

REGISTRY := eu.gcr.io/gardener-project
IMAGE    := $(REGISTRY)/$(ORGANIZATION)/$(PROJECT)
TAG      := $(shell cat ./VERSION)-$(VERSION)

.PHONY: npm-build
npm-build: clean
	@npm run --prefix frontend -s build

.PHONY: docker-build
docker-build: npm-build
	docker build -t $(IMAGE):$(TAG) --rm .

.PHONY: docker-push
docker-push:
	@if ! docker images $(IMAGE) | awk '{ print $$2 }' | grep -q -F $(TAG); then echo "$(IMAGE) version $(TAG) is not yet built. Please run 'make docker-build'"; false; fi
	@gcloud config configurations activate gardener
	@docker push $(IMAGE):$(TAG)

.PHONY: release
release: docker-build docker-push

.PHONY: clean
clean:
	@rm -rf backend/node_modules
	@rm -rf frontend/dist
