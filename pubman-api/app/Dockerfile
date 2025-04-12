# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app

# Set the working directory
WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the image
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Run the Flask server
CMD ["flask", "run", "--host=0.0.0.0"]
