# Gunicorn config variables
loglevel = "info"
errorlog = "-"  # stderr
# Disabled gunicorn accesslog (uses app logs)
# accesslog = "-"  # stdout
worker_tmp_dir = "/dev/shm"
graceful_timeout = 120
timeout = 120
keepalive = 5
workers = 3
max_requests = 100