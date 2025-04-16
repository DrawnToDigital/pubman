import logging

from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from werkzeug.middleware.proxy_fix import ProxyFix

bcrypt = Bcrypt()
db = SQLAlchemy()
jwt = JWTManager()
ma = Marshmallow()  # must be initialized after db


def configure_gunicorn(app):
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)


def configure_teardown(app):
    # Note: This makes shutdown MUCH faster
    @app.teardown_appcontext
    def shutdown_session(exc=None):
        if hasattr(app, "db_connection"):
            app.db_connection.close()
