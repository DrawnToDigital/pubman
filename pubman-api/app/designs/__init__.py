from flask import Blueprint

bp = Blueprint("designs", __name__)

from app.designs import routes
