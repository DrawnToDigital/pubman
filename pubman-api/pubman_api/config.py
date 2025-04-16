import os

from flask import Flask


class BaseConfig:
    DEBUG = os.getenv("DEBUG", "").lower() in ("true", "1")
    SECRET_KEY = "my-secret-key"
    JWT_SECRET_KEY = "my-jwt-secret-key"

    DB_HOST = "db"
    DB_PORT = 5432
    DB_USER = "pubman_api"
    DB_PASSWORD = ""
    DB_NAME = "pubman_db"
    SQLALCHEMY_DATABASE_URI = ""

    STORAGE_BUCKET = ""
    STORAGE_REGION = ""
    STORAGE_ACCESS_KEY_ID = ""
    STORAGE_SECRET_ACCESS_KEY = ""
    STORAGE_URL = ""


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class ProductionConfig(BaseConfig):
    DEBUG = False


def from_env(app: Flask):
    # Configure the pubman_api
    app.config["ENV"] = os.environ.get("FLASK_ENV", "production")
    if app.config["ENV"] == "development":
        app.config.from_object(DevelopmentConfig)
    else:
        app.config.from_object(ProductionConfig)

    # Load environment variables
    app.config.from_prefixed_env(prefix="PUBMAN")

    # Setup database connection
    db_conf = app.config.get_namespace("DB_")
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"postgresql://{db_conf['user']}:{db_conf['password']}@{db_conf['host']}:{db_conf['port']}/{db_conf['name']}"
    )
