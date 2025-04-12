#!/bin/bash

# stop previous
$(docker compose down)

# Start the Docker container using Docker Compose
$(docker compose up -d)

# Wait for up to 10 seconds for the database to be ready
timeout=10
elapsed=0
interval=1

while [ $elapsed -lt $timeout ]; do
    # Check if the database is up by attempting to connect
    if docker compose exec db pg_isready -U postgres -d pubman_db > /dev/null; then
        # Check the Docker logs for "database system is ready to accept connections"
        log_timeout=10
        log_elapsed=0
        log_interval=1

        while [ $log_elapsed -lt $log_timeout ]; do
            if docker compose logs db --tail 20 | grep -q "database system is ready to accept connections"; then
                echo "Database system is ready to accept connections"

                # Check the Docker logs for errors related to init.sql
                if docker compose logs db --tail 20 | grep -i "ERROR"; then
                    echo "Error found in init.sql execution"
                        exit 1
                    else
                        echo "DB is up"
                        exit 0
                    fi
                fi

                # Wait for the interval and increment the elapsed time
                sleep $log_interval
                log_elapsed=$((log_elapsed + log_interval))
            done

            echo "Database system is not ready to accept connections after $log_timeout seconds"
            exit 1
        else
            # Check the Docker logs for errors related startup
            if docker compose logs db --tail 20 | grep -i "ERROR"; then
                echo "Error found in startup"
                exit 1
            fi
        fi

        # Wait for the interval and increment the elapsed time
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    echo "DB is not up after $timeout seconds"
    exit 1
