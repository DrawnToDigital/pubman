import logging

from flask import Flask

from pubman_api import config
from pubman_api.extensions import bcrypt, db, jwt, ma, configure_logging, configure_gunicorn


def create_app() -> Flask:
    configure_logging(debug=False)
    app = Flask(__name__)
    config.from_env(app)
    app.logger.setLevel(logging.INFO)

    logging.info("Starting PubMan API application...")

    # Initialize extensions
    bcrypt.init_app(app)
    db.init_app(app)
    jwt.init_app(app)
    ma.init_app(app)
    configure_gunicorn(app)

    # Note: This makes shutdown MUCH faster
    @app.teardown_appcontext
    def shutdown_session(exc=None):
        if hasattr(app, 'db_connection'):
            app.db_connection.close()

    app.logger.info("Extensions initialized")

    # Register blueprints
    logging.info("Registering blueprints...")

    from pubman_api.main import bp as main_bp
    from pubman_api.auth import bp as auth_bp
    from pubman_api.design.routes import bp as designs_bp
    from pubman_api.storage.routes import bp as storage_bp
    from pubman_api.user.routes import bp as user_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(user_bp, url_prefix="/user")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(designs_bp, url_prefix="/design")
    app.register_blueprint(storage_bp, url_prefix="/storage")

    app.logger.info("Blueprints registered")

    return app
