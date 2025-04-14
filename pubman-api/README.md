# PubMan API

## Local Setup

### 1. Edit `/etc/hosts` and add
```
127.0.0.1 pubman.local
127.0.0.1 pubman-api.local
127.0.0.1 pubman-storage.local
```

### 2. Setup Python Env
```shell
./pubman/setup.sh  # creates pubman/.venv/ and installs deps
```

### 3. Setup Docker
```shell
docker compose build
```

### 4. Run the API
```shell
./run_local.sh

# or

docker compose up -d
```

### 5. Check the logs
```shell
docker compose logs app
docker compose logs db

# or

docker compose logs -f
```

### 6. Connect to the mysql console as `postgres` superuser
```shell
./connect_db.sh  # connects to postman_db as postgres user
```
Then in the `mysql` console:
```
\db  # list databases
\dt  # list tables

SET role TO pubman_api;

select * from users;  # list users
```


## Updating Python Dependencies
```shell
./update_reqs.sh  # updates requirements.txt from .in using pip-compile
```