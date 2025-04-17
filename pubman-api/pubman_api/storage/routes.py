import datetime
import io
import os

import magic

from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from pubman_api.design_asset.schema import DesignAssetSchema
from pubman_api.extensions import db
from pubman_api.db_model.design import Design
from pubman_api.db_model.design_asset import DesignAsset
from pubman_api.db_model.designer import Designer
from pubman_api.storage import bp, s3_client

ALLOWED_EXTENSIONS = {"stl", "obj", "3mf", "jpg", "jpeg", "png", "gif"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
MAX_FILE_SIZE_STR = "50MB"


@bp.route("/<string:design_key>/upload", methods=["POST"])
@jwt_required()
def upload_file(design_key):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    username = get_jwt_identity()
    designer = Designer.query.filter_by(username=username, deleted_at=None, status='active').first()
    if not designer:
        current_app.logger.warning(f"Designer '{username}' not found")
        return jsonify({"error": "Designer not found"}), 404

    design = Design.query.filter_by(
        design_key=design_key, designer_id=designer.id
    ).first()
    if not design:
        current_app.logger.warning(
            f"File upload failed: Design key {design_key} not found for username: {username}"
        )
        return jsonify({"error": "Design not found"}), 404

    # Read the file content once
    file_content = file.read()
    file_size = len(file_content)

    # Validate file type
    mime_type = magic.from_buffer(file_content, mime=True)
    if (
        "." not in file.filename
        or file.filename.rsplit(".", 1)[1].lower() not in ALLOWED_EXTENSIONS
    ):
        return jsonify({"error": "File type not allowed"}), 400

    # Validate file size
    if file_size > MAX_FILE_SIZE:
        return (
            jsonify({"error": f"File exceeds maximum size of {MAX_FILE_SIZE_STR}"}),
            400,
        )

    try:
        # Save the file securely to the S3 bucket
        s3 = s3_client()
        bucket_name = current_app.config["STORAGE_BUCKET"]
        clean_filename = secure_filename(file.filename)
        date_path = datetime.date.today().strftime("%Y/%m/%d")
        file_path = os.path.join(f"user_uploads/", date_path, os.urandom(16).hex())

        s3.upload_fileobj(
            io.BytesIO(file_content),  # Use the in-memory file content
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
        # Register the uploaded file in the design_asset table
        new_asset = DesignAsset(
            design_id=design.id,
            designer_id=designer.id,
            file_name=clean_filename,
            file_path=file_path,
            mime_type=mime_type,
        )
        db.session.add(new_asset)
        db.session.commit()

        return jsonify(DesignAssetSchema().dump(new_asset)), 201
    except Exception as e:
        current_app.logger.exception(f"File registration failed for {design_key}")
        return jsonify({"error": "Internal server error"}), 500
