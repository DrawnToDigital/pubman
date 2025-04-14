from flask import Blueprint

bp = Blueprint("storage", __name__)

from pubman_api.storage import routes
