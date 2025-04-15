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
        "disable_existing_loggers": True,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
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
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "default",
                "filename": "/var/log/gunicorn.error.log",
                "maxBytes": 10000,
                "backupCount": 10,
                "delay": "True",
            },
            "access_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "formatter": "access",
                "filename": "/var/log/gunicorn.access.log",
                "maxBytes": 10000,
                "backupCount": 10,
                "delay": "True",
            }
        },
        "loggers": {
            "gunicorn.error": {
                "handlers": ["console"] if debug else ["console", "error_file"],
                "level": "INFO",
                "propagate": False,
            },
            "gunicorn.access": {
                "handlers": ["console"] if debug else ["console", "access_file"],
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
