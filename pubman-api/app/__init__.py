import logging
import os
from time import strftime

from flask import Flask, request
from dotenv import load_dotenv

from app.extensions import bcrypt, db, jwt, ma, configure_logging


def create_app():
    app = Flask(__name__)

    configure_logging(app)
    app.logger.setLevel(logging.INFO)

    @app.after_request
    def after_request(response):
        timestamp = strftime("[%Y-%b-%d %H:%M]")
        app.logger.error(
            "%s %s %s %s %s %s",
            timestamp,
            request.remote_addr,
            request.method,
            request.scheme,
            request.full_path,
            response.status,
        )
        return response

    logging.info("Starting PubMan API application...")

    # Configure the app
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

    from app.main import bp as main_bp

    app.register_blueprint(main_bp)
    app.logger.info("Main blueprint registered at /")

    from app.auth import bp as auth_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.logger.info("Auth blueprint registered at /auth")

    from app.designs.routes import bp as designs_bp

    app.register_blueprint(designs_bp, url_prefix="/designs")
    app.logger.info("Designs blueprint registered at /designs")

    return app
