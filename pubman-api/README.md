# PubMan API

## Postman Collection
This is a Postman collection for the PubMan API. It contains all the endpoints and examples of how to use them.

[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://.postman.co/workspace/My-Workspace~622b49d0-88c2-442a-84fe-e34acc7ecc2a/collection/8500514-57e45628-630c-4fb1-bc98-e607295bf056?action=share&creator=8500514)

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