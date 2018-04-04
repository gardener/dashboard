ORGANIZATION := gardener
PROJECT      := dashboard
VERSION      ?= $(shell ./scripts/git-version)

REGISTRY := eu.gcr.io/gardener-project
IMAGE    := $(REGISTRY)/$(ORGANIZATION)/$(PROJECT)
TAG      := $(VERSION)

.PHONY: build
build: clean
	@npm run --prefix frontend -s build

.PHONY: docker-image
docker-image: build
	docker build -t $(IMAGE):$(TAG) --rm .

.PHONY: docker-login
docker-login:
	@gcloud auth activate-service-account --key-file ~/.config/gcloud/gcr-readwrite.json

.PHONY: docker-push
docker-push:
	@if ! docker images $(IMAGE) | awk '{ print $$2 }' | grep -q -F $(TAG); then echo "$(IMAGE) version $(TAG) is not yet built. Please run 'make docker-image'"; false; fi
	@gcloud docker -- push $(IMAGE):$(TAG)

.PHONY: release
release: docker-image docker-login docker-push

.PHONY: clean
clean:
	@rm -rf frontend/dist
