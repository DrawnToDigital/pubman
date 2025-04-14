from flask import Blueprint

bp = Blueprint("main", __name__)

from pubman_api.main import routes
