from flask import Blueprint

bp = Blueprint("auth", __name__)

from pubman_api.auth import routes
