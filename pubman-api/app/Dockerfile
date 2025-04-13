# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    libmagic1

# Create a non-privileged user that the app will run under.
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

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app

# Set the working directory
WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Update pip
RUN pip install --upgrade pip

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the image
COPY --chown=appuser:appuser . .

# Expose the port the app runs on
EXPOSE 5000

USER appuser

# Run the Flask server
CMD ["flask", "run", "--host=0.0.0.0"]
