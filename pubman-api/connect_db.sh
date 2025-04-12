#!/bin/bash

# Run psql inside the Docker container
PGPASSWORD=postgres
PGOPTIONS=--search_path=postgres,pubman_db,public
docker compose exec -e PGPASSWORD=$PGPASSWORD -e PGOPTIONS=$PGOPTIONS db psql -U postgres -d pubman_db
