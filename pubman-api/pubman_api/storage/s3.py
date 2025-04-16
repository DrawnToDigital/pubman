import boto3
from botocore.config import Config
from flask import current_app


def s3_client(**kwargs):
    verify_ssl = True
    if current_app.config.get("ENV", "") == "development":
        current_app.logger.warning("Insecure S3 in development")
        verify_ssl = False
    s3 = boto3.client(
        "s3",
        verify=verify_ssl,
        config=Config(connect_timeout=3, read_timeout=30),
        **kwargs,
    )
    return s3
