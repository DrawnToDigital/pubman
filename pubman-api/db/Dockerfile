# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

ARG PUBLIC_POSTGRES_PASSWORD=postgres

# Set environment variables for PostgreSQL
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=${PUBLIC_POSTGRES_PASSWORD}
ENV POSTGRES_DB=postgres

# Copy the initialization script to the Docker image
COPY init.sql /docker-entrypoint-initdb.d/

# Expose the default PostgreSQL port
EXPOSE 5432
