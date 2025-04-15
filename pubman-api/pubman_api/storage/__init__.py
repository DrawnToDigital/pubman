from flask import Blueprint

from pubman_api.storage.s3 import s3_client

bp = Blueprint("storage", __name__)

from pubman_api.storage import routes
