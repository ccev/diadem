# Diadem Docker Build & Release Makefile

# Registry and image configuration (override with environment variables)
DIADEM_DOCKER_REGISTRY ?= ghcr.io
DIADEM_DOCKER_REPOSITORY ?= ccev/diadem
DIADEM_DOCKER_IMAGE ?= $(DIADEM_DOCKER_REGISTRY)/$(DIADEM_DOCKER_REPOSITORY)

# Version tagging (defaults to git short hash)
GIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_DIRTY := $(shell git diff --quiet 2>/dev/null || echo "-dirty")
DIADEM_DOCKER_VERSION ?= $(GIT_HASH)$(GIT_DIRTY)

# Additional tags
DIADEM_DOCKER_LATEST_TAG ?= latest

# Docker build options
DIADEM_DOCKER_BUILD_ARGS ?=
DIADEM_DOCKER_PLATFORM ?= linux/amd64,linux/arm64
DIADEM_DOCKER_FILE ?= Dockerfile

# Helm chart
HELM_CHART_PATH := helm/diadem

.PHONY: help build release build-and-release tag clean lint helm-lint helm-package

help: ## Show this help message
	@echo "Diadem Docker Build & Release"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Configuration (override with environment variables):"
	@echo "  DIADEM_DOCKER_REGISTRY   = $(DIADEM_DOCKER_REGISTRY)"
	@echo "  DIADEM_DOCKER_REPOSITORY = $(DIADEM_DOCKER_REPOSITORY)"
	@echo "  DIADEM_DOCKER_IMAGE      = $(DIADEM_DOCKER_IMAGE)"
	@echo "  DIADEM_DOCKER_VERSION    = $(DIADEM_DOCKER_VERSION)"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

build: ## Build image for local platform only
	docker build \
		--tag $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_VERSION) \
		--tag $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_LATEST_TAG) \
		--file $(DIADEM_DOCKER_FILE) \
		$(DIADEM_DOCKER_BUILD_ARGS) \
		.

release: ## Push locally built image to registry
	docker push $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_VERSION)
	docker push $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_LATEST_TAG)

build-and-release: ## Build multi-platform image and push to registry
	docker buildx build \
		--platform $(DIADEM_DOCKER_PLATFORM) \
		--tag $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_VERSION) \
		--tag $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_LATEST_TAG) \
		--file $(DIADEM_DOCKER_FILE) \
		--push \
		$(DIADEM_DOCKER_BUILD_ARGS) \
		.

tag: ## Tag an existing image with a new tag (e.g., make tag NEW_TAG=v1.0.0)
	@test -n "$(NEW_TAG)" || (echo "NEW_TAG is required" && exit 1)
	docker buildx imagetools create \
		--tag $(DIADEM_DOCKER_IMAGE):$(NEW_TAG) \
		$(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_VERSION)

clean: ## Remove local images
	-docker rmi $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_VERSION) 2>/dev/null
	-docker rmi $(DIADEM_DOCKER_IMAGE):$(DIADEM_DOCKER_LATEST_TAG) 2>/dev/null

lint: ## Lint Dockerfile with hadolint
	@command -v hadolint >/dev/null 2>&1 && hadolint $(DIADEM_DOCKER_FILE) || \
		docker run --rm -i hadolint/hadolint < $(DIADEM_DOCKER_FILE)

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
	@echo "Registry:    $(DIADEM_DOCKER_REGISTRY)"
	@echo "Repository:  $(DIADEM_DOCKER_REPOSITORY)"
	@echo "Image:       $(DIADEM_DOCKER_IMAGE)"
	@echo "Version:     $(DIADEM_DOCKER_VERSION)"
	@echo "Git Hash:    $(GIT_HASH)"
	@echo "Platforms:   $(DIADEM_DOCKER_PLATFORM)"
	@echo "Dockerfile:  $(DIADEM_DOCKER_FILE)"
