from logging.config import dictConfig

from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from werkzeug.middleware.proxy_fix import ProxyFix

bcrypt = Bcrypt()
db = SQLAlchemy()
jwt = JWTManager()
ma = Marshmallow()  # must be initialized after db


def configure_logging(debug: bool):
    dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] [%(process)d] [%(thread)d %(threadName)s] %(levelname)s in %(module)s: %(message)s",
            },
            "access": {
                "format": "%(message)s",
            }
        },
        "handlers": {
            "console": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            }
        },
        "loggers": {
            "gunicorn.error": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "gunicorn.access": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            }
        },
        "root": {
            "level": "DEBUG" if debug else "INFO",
            "handlers": ["console"],
        }
    })

def configure_gunicorn(app):
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )

def configure_teardown(app):
    # Note: This makes shutdown MUCH faster
    @app.teardown_appcontext
    def shutdown_session(exc=None):
        if hasattr(app, 'db_connection'):
            app.db_connection.close()