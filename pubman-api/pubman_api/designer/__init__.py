from flask import Blueprint

bp = Blueprint("designer", __name__)

from pubman_api.designer import routes
