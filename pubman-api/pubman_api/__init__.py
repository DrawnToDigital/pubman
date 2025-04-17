import logging
import time

from flask import Flask, g, request
from flask.logging import default_handler

from pubman_api import config
from pubman_api.extensions import bcrypt, db, jwt, ma
from pubman_api.extensions import configure_gunicorn, configure_teardown


def configure_logging(app: Flask):
    logging.basicConfig(level=logging.DEBUG if app.debug else logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(process)d] [%(thread)d %(threadName)s] %(levelname)s in %(name)s: %(message)s"
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Configure Flask logger
    flask_logger = logging.getLogger("flask.app")
    flask_logger.handlers.clear()
    flask_logger.addHandler(handler)

    # Configure Gunicorn loggers
    # gunicorn_error_logger = logging.getLogger("gunicorn.error")
    # gunicorn_error_logger.propagate = True  # Let app logger handle it
    # gunicorn_access_logger = logging.getLogger("gunicorn.access")
    # gunicorn_access_logger.propagate = True  # Let app logger handle it

    # Request logging
    @app.before_request
    def before_request():
        g.start_time = time.time()
        app.logger.info(
            "%s %s %s %s %s %s",
            request.remote_addr,
            request.method,
            request.scheme,
            request.full_path,
            "START",
            request.headers.get("User-Agent"),
        )
        if app.debug:
            app.logger.debug("Headers:\n%s", request.headers)
            app.logger.debug("Body:\n%s", request.get_data())

    @app.after_request
    def after_request(response):
        duration = time.time() - g.start_time
        app.logger.info(
            "%s %s %s %s %s %s %s",
            request.remote_addr,
            request.method,
            request.scheme,
            request.full_path,
            response.status,
            duration,
            request.headers.get("User-Agent"),
        )
        return response


def create_app() -> Flask:
    app = Flask(__name__)
    config.from_env(app)
    configure_logging(app)
    app.logger.removeHandler(default_handler)

    app.logger.info("Starting PubMan API application...")

    # Initialize extensions
    bcrypt.init_app(app)
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    configure_gunicorn(app)
    configure_teardown(app)

    app.logger.info("Extensions initialized")

    # Register blueprints
    app.logger.info("Registering blueprints...")

    from pubman_api.main import bp as main_bp
    from pubman_api.auth import bp as auth_bp
    from pubman_api.design.routes import bp as design_bp
    from pubman_api.storage.routes import bp as storage_bp
    from pubman_api.designer.routes import bp as designer_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(designer_bp, url_prefix="/designer")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(design_bp, url_prefix="/design")
    app.register_blueprint(storage_bp, url_prefix="/storage")

    app.logger.info("Blueprints registered")

    return app
