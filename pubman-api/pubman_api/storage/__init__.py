import boto3
from botocore.config import Config
from flask import Blueprint, current_app

bp = Blueprint("storage", __name__)

def s3_client():
    verify_ssl = True
    if current_app.config.get("FLASK_ENV", "") == "development":
        verify_ssl = False
    s3 = boto3.client(
        "s3",
        verify=verify_ssl,
        config=Config(connect_timeout=3, read_timeout=30),
    )
    return s3

from pubman_api.storage import routes
