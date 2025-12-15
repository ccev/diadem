# Diadem Docker Build & Release Makefile

# Registry and image configuration (override with environment variables)
REGISTRY ?= ghcr.io
REPOSITORY ?= ccev/diadem
IMAGE_NAME ?= $(REGISTRY)/$(REPOSITORY)

# Version tagging (defaults to git short hash)
GIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_DIRTY := $(shell git diff --quiet 2>/dev/null || echo "-dirty")
VERSION ?= $(GIT_HASH)$(GIT_DIRTY)

# Additional tags
LATEST_TAG ?= latest

# Docker build options
DOCKER_BUILD_ARGS ?=
DOCKER_PLATFORM ?= linux/amd64,linux/arm64
DOCKERFILE ?= Dockerfile

# Helm chart
HELM_CHART_PATH := helm/diadem

.PHONY: help build release build-and-release tag clean lint helm-lint helm-package

help: ## Show this help message
	@echo "Diadem Docker Build & Release"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Configuration (override with environment variables):"
	@echo "  REGISTRY     = $(REGISTRY)"
	@echo "  REPOSITORY   = $(REPOSITORY)"
	@echo "  IMAGE_NAME   = $(IMAGE_NAME)"
	@echo "  VERSION      = $(VERSION)"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

build: ## Build image for local platform only
	docker build \
		--tag $(IMAGE_NAME):$(VERSION) \
		--tag $(IMAGE_NAME):$(LATEST_TAG) \
		--file $(DOCKERFILE) \
		$(DOCKER_BUILD_ARGS) \
		.

release: ## Push locally built image to registry
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):$(LATEST_TAG)

build-and-release: ## Build multi-platform image and push to registry
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--tag $(IMAGE_NAME):$(VERSION) \
		--tag $(IMAGE_NAME):$(LATEST_TAG) \
		--file $(DOCKERFILE) \
		--push \
		$(DOCKER_BUILD_ARGS) \
		.

tag: ## Tag an existing image with a new tag (e.g., make tag VERSION=abc123 NEW_TAG=v1.0.0)
	@test -n "$(NEW_TAG)" || (echo "NEW_TAG is required" && exit 1)
	docker buildx imagetools create \
		--tag $(IMAGE_NAME):$(NEW_TAG) \
		$(IMAGE_NAME):$(VERSION)

clean: ## Remove local images
	-docker rmi $(IMAGE_NAME):$(VERSION) 2>/dev/null
	-docker rmi $(IMAGE_NAME):$(LATEST_TAG) 2>/dev/null

lint: ## Lint Dockerfile with hadolint
	@command -v hadolint >/dev/null 2>&1 && hadolint $(DOCKERFILE) || \
		docker run --rm -i hadolint/hadolint < $(DOCKERFILE)

helm-lint: ## Lint Helm chart
	helm lint $(HELM_CHART_PATH)

helm-package: ## Package Helm chart
	helm package $(HELM_CHART_PATH)

helm-template: ## Render Helm chart templates
	helm template diadem $(HELM_CHART_PATH)

# Docker Compose targets
.PHONY: up down logs

up: ## Start services with docker-compose
	docker compose up -d

down: ## Stop services with docker-compose
	docker compose down

logs: ## View docker-compose logs
	docker compose logs -f

# Development helpers
.PHONY: setup-buildx info

setup-buildx: ## Set up Docker buildx for multi-platform builds
	docker buildx create --name diadem-builder --use 2>/dev/null || docker buildx use diadem-builder
	docker buildx inspect --bootstrap

info: ## Show build configuration
	@echo "Registry:    $(REGISTRY)"
	@echo "Repository:  $(REPOSITORY)"
	@echo "Image:       $(IMAGE_NAME)"
	@echo "Version:     $(VERSION)"
	@echo "Git Hash:    $(GIT_HASH)"
	@echo "Platforms:   $(DOCKER_PLATFORM)"
	@echo "Dockerfile:  $(DOCKERFILE)"
