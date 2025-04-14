import datetime
import os

import boto3
import magic
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename

from app.storage import bp

ALLOWED_EXTENSIONS = {"stl", "obj", "3mf", "jpg", "jpeg", "png", "gif", "bmp", "tiff"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
MAX_FILE_SIZE_STR = "50MB"


@bp.route("/upload", methods=["POST"])
def upload_file():
    # Check if a file is included in the request
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    # Check if the file is valid
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    mime_type = magic.from_buffer(file.read(2048), mime=True)

    if (
        "." not in file.filename
        or file.filename.rsplit(".", 1)[1].lower() not in ALLOWED_EXTENSIONS
    ):
        return jsonify({"error": "File type not allowed"}), 400

    # Check file size
    file.seek(0, 2)  # Move to the end of the file
    file_length = file.tell()
    file.seek(0)  # Reset file pointer to the beginning
    if file_length > MAX_FILE_SIZE:
        return (
            jsonify({"error": f"File exceeds maximum size of {MAX_FILE_SIZE_STR}"}),
            400,
        )

    # Save the file securely to the S3 bucket
    s3 = boto3.client("s3")
    bucket_name = current_app.config["STORAGE_BUCKET_NAME"]
    clean_filename = secure_filename(file.filename)
    date_path = datetime.date.today().strftime("%Y/%m/%d")
    file_path = os.path.join(f"user_uploads/", date_path, os.urandom(16).hex())

    s3.upload_fileobj(
        file,
        bucket_name,
        file_path,
        ExtraArgs={
            "ContentDisposition": f"attachment;filename={clean_filename}",
            "ContentType": mime_type,
        },
    )

    # Generate a public URL for the uploaded file
    signed_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": file_path},
        ExpiresIn=24 * 60 * 60,  # URL valid for 24 hours
    )

    return (
        jsonify({"message": "File uploaded successfully", "file_url": signed_url}),
        200,
    )
