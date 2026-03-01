# Weather API Makefile
# Standardized commands for development and maintenance.

.PHONY: help install start test clean docker-build docker-run

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install project dependencies
	npm install

start: ## Start the API server (Production mode with Clustering)
	npm start

test: ## Run integration tests with Jest
	npm test

clean: ## Remove node_modules and other generated files
	rm -rf node_modules coverage

docker-build: ## Build the Docker image
	docker build -t weather-api .

docker-run: ## Run the API via Docker
	docker run --rm -p 8080:8080 weather-api
