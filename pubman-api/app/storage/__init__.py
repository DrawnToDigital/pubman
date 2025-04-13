from flask import Blueprint

bp = Blueprint("storage", __name__)

from app.storage import upload
