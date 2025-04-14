from flask import Blueprint

bp = Blueprint("user", __name__)

from pubman_api.user import routes
