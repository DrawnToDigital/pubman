from flask import Blueprint

bp = Blueprint("design", __name__)

from pubman_api.design import routes
