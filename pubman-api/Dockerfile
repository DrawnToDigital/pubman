# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    libmagic1

# Create a non-privileged user that the pubman_api will run under.
# See https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Set the working directory
WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Update pip
RUN pip install --upgrade pip

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the image
COPY --chown=appuser:appuser pubman_api/ pubman_api/

# Expose the port the pubman_api runs on
EXPOSE 5000

USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=pubman_api

# Run the Flask server
CMD gunicorn \
    --workers 2 --bind 0.0.0.0:5000 \
    --max-requests 100 \
    pubman_api.wsgi:app

# With gunicorn access logs
# CMD gunicorn \
#    --workers 2 --bind 0.0.0.0:5000 \
#    --max-requests 100 \
#    --log-level info \
#    --access-logfile=- \
#    pubman_api.wsgi:app