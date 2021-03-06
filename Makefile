DOCKER_IMAGE := t-rex-runner
.DEFAULT_GOAL := build

.PHONY: build
build:
	docker build --rm \
	-t $(DOCKER_IMAGE) \
	-f Dockerfile \
	.

.PHONY: run
run:
	docker run --rm -it \
	-p 3000:3000 \
	-v $(CURDIR)/src:/home/app/src:ro \
	$(DOCKER_IMAGE)

.PHONY: shell
shell:
	docker run --rm -it \
	-v $(CURDIR)/src:/home/app/src:ro \
	-p 3000:3000 \
	$(DOCKER_IMAGE) \
	/bin/bash