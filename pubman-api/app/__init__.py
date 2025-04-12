from flask import Flask
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
import logging
import os
from dotenv import load_dotenv

# Initialize extensions
bcrypt = Bcrypt()
db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Configure the app
    dotenv_path = os.path.join("/config", os.environ.get("APP_CONFIG_FILE", "local.env"))
    if not load_dotenv(dotenv_path):
        raise Exception(f"Could not load environment variables from {dotenv_path}")
    print(dotenv_path)
    app.config.from_prefixed_env(prefix="PUBMAN")
    dbconf = app.config.get_namespace('DB_')

    print(dbconf)

    app.config[
        "SQLALCHEMY_DATABASE_URI"
    ] = f"postgresql://{dbconf['user']}:{dbconf['password']}@{dbconf['host']}:{dbconf['port']}/{dbconf['name']}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize extensions
    bcrypt.init_app(app)
    db.init_app(app)
    jwt.init_app(app)

    # Set up logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(handler)

    # Index
    @app.route("/", methods=["GET"])
    def index():
        return {"message": "PubMan API"}, 200

    # Basic health check route
    @app.route("/health", methods=["GET"])
    def health_check():
        return {"status": "healthy"}, 200

    # Register blueprints
    from .auth import auth_bp
    from .models import models_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(models_bp, url_prefix="/models")

    return app
