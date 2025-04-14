import logging
import os
from time import strftime

from flask import Flask, request
from dotenv import load_dotenv

from pubman_api.extensions import bcrypt, db, jwt, ma, configure_logging


def create_app():
    app = Flask(__name__)

    configure_logging(app)
    app.logger.setLevel(logging.INFO)

    logging.info("Starting PubMan API application...")

    # Configure the pubman_api
    dotenv_path = os.path.join(
        "/config", os.environ.get("APP_CONFIG_FILE", "local.env")
    )
    if not load_dotenv(dotenv_path):
        app.logger.error(f"Could not load environment variables from {dotenv_path}")
        raise Exception(f"Could not load environment variables from {dotenv_path}")
    app.logger.info(f"Environment variables loaded from {dotenv_path}")

    app.config.from_prefixed_env(prefix="PUBMAN")
    dbconf = app.config.get_namespace("DB_")

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"postgresql://{dbconf['user']}:{dbconf['password']}@{dbconf['host']}:{dbconf['port']}/{dbconf['name']}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.logger.info(f"Database host: {dbconf['host']}, Database name: {dbconf['name']}")

    # Initialize extensions
    bcrypt.init_app(app)
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    app.logger.info("Extensions initialized")

    # Register blueprints
    logging.info("Registering blueprints...")

    from pubman_api.main import bp as main_bp

    app.register_blueprint(main_bp)

    from pubman_api.auth import bp as auth_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")

    from pubman_api.design.routes import bp as designs_bp

    app.register_blueprint(designs_bp, url_prefix="/design")

    from pubman_api.storage.routes import bp as storage_bp

    app.register_blueprint(storage_bp, url_prefix="/storage")

    from pubman_api.user.routes import bp as user_bp

    app.register_blueprint(user_bp, url_prefix="/user")

    app.logger.info("Blueprints registered")

    return app
