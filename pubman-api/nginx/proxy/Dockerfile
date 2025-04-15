FROM nginxproxy/nginx-proxy:1.7
RUN { \
      echo 'server_tokens off;'; \
      echo 'client_max_body_size 100m;'; \
    } > /etc/nginx/conf.d/my_proxy.conf

WORKDIR /etc/nginx/certs/

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout pubman-api.local.key -out pubman-api.local.crt -subj "/C=US/ST=State/L=City/O=Organization/OU=Department/CN=pubman-api.local"
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout pubman-storage.local.key -out pubman-storage.local.crt -subj "/C=US/ST=State/L=City/O=Organization/OU=Department/CN=pubman-storage.local"

WORKDIR /app/