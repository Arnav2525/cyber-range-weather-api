
# Standardized commands for development and maintenance.

.PHONY:  clean docker-build docker-run


clean: ## Remove node_modules and other generated files
	rm -rf node_modules coverage

docker-build: ## Build the Docker image
	docker build -t weather-api .

docker-run: ## Run the API via Docker
	docker run --rm -p 8080:8080 weather-api
