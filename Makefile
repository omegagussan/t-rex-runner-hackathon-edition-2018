DOCKER_IMAGE := t-rex-runner
.DEFAULT_GOAL := build

.PHONY: build
build:
	docker build --rm \
	-t $(DOCKER_IMAGE) \
	-f Dockerfile \
	.

.PHONY: train
train:
	docker run --rm -it \
	-p 3000:3000 \
	-v $(CURDIR)/src:/home/app/src:ro \
	-v $(CURDIR)/data:/home/app/data \
	$(DOCKER_IMAGE)

.PHONY: demo
demo:
	docker run --rm -it \
	-p 3000:3000 \
	-v $(CURDIR)/src:/home/app/src:ro \
	-v $(CURDIR)/data:/home/app/data \
	$(DOCKER_IMAGE) \
	python -m server --demo

.PHONY: shell
shell:
	docker run --rm -it \
	-v $(CURDIR)/src:/home/app/src:ro \
	-v $(CURDIR)/data:/home/app/data \
	-p 3000:3000 \
	$(DOCKER_IMAGE) \
	/bin/bash