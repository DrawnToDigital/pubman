# PubMan API

## Local Setup

1. Edit `/etc/hosts` and add
```
127.0.0.1 pubman.local
127.0.0.1 pubman-api.local
127.0.0.1 pubman-storage.local
```

2. Setup Python Env
```shell
cd pubman-api/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Setup Docker
```shell
docker compose build
```

4. Run the API
```shell
./run_local.sh

# or

docker compose up -d
```

5. Check the logs
```shell
docker compose logs app
docker compose logs db

# or

docker compose logs -f
```