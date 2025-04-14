import datetime
import os

import boto3
import magic
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from pubman_api.db_model.design import Design
from pubman_api.db_model.user import User
from pubman_api.storage import bp

ALLOWED_EXTENSIONS = {"stl", "obj", "3mf", "jpg", "jpeg", "png", "gif", "bmp", "tiff"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
MAX_FILE_SIZE_STR = "50MB"


@bp.route("/<string:design_key>/upload", methods=["POST"])
@jwt_required()
def upload_file(design_key):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    # Check if the file is valid
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.warning(f"User '{username}' not found")
        return jsonify({"error": "User not found"}), 404

    # Check if the design exists and belongs to the user
    design = Design.query.filter_by(design_key=design_key, user_id=user.id).first()
    if not design:
        current_app.logger.warning(
            f"File upload failed: Design key {design_key} not found for username: {username}"
        )
        return jsonify({"error": "Design not found"}), 404

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

    try:
        # Save the file securely to the S3 bucket
        s3 = boto3.client("s3")
        bucket_name = current_app.config["STORAGE_BUCKET"]
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

        current_app.logger.info(
            f"File '{file.filename}' uploaded successfully for design key: {design_key}"
        )
    except Exception as e:
        current_app.logger.exception(f"File upload failed for design key: {design_key}")
        return jsonify({"error": "Internal server error"}), 500

    try:
        # Generate a public URL for the uploaded file
        signed_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": file_path},
            ExpiresIn=24 * 60 * 60,  # URL valid for 24 hours
        )
        return jsonify({"url": signed_url}), 200
    except Exception as e:
        current_app.logger.exception(f"File url signing failed for {design_key}")
        return jsonify({"error": "Internal server error"}), 500
