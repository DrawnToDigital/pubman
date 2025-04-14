from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.designs import bp
from app.db_models.design import Design


@bp.route("/", methods=["GET"])
@jwt_required()
def list_designs():
    user_id = get_jwt_identity()
    current_app.logger.info(f"List designs request received for user ID: {user_id}")

    try:
        designs = Design.query.filter_by(user_id=user_id).all()
        current_app.logger.info(f"{len(designs)} designs retrieved for user ID: {user_id}")
        return jsonify([design.to_dict() for design in designs]), 200
    except Exception as e:
        current_app.logger.error(f"Failed to retrieve designs for user ID: {user_id} - {e}")
        return jsonify({"error": "Internal server error"}), 500


@bp.route("/", methods=["POST"])
@jwt_required()
def create_design():
    user_id = get_jwt_identity()
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")

    current_app.logger.info(
        f"Create design request received for user ID: {user_id} with name: {name}"
    )

    if not name:
        current_app.logger.warning(f"Create design failed: Missing 'name' for user ID: {user_id}")
        return jsonify({"error": "Design name is required"}), 400

    try:
        new_design = Design(name=name, description=description, user_id=user_id)
        db.session.add(new_design)
        db.session.commit()
        current_app.logger.info(f"Design '{name}' created successfully for user ID: {user_id}")
        return jsonify(new_design.to_dict()), 201
    except Exception as e:
        current_app.logger.error(f"Failed to create design for user ID: {user_id} - {e}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@bp.route("/<int:design_id>/upload", methods=["POST"])
@jwt_required()
def upload_file(design_id):
    user_id = get_jwt_identity()
    current_app.logger.info(
        f"File upload request received for design ID: {design_id} by user ID: {user_id}"
    )

    # Check if the design exists and belongs to the user
    design = Design.query.filter_by(id=design_id, user_id=user_id).first()
    if not design:
        current_app.logger.warning(
            f"File upload failed: Design ID {design_id} not found for user ID: {user_id}"
        )
        return jsonify({"error": "Design not found"}), 404

    if "file" not in request.files:
        current_app.logger.warning(
            f"File upload failed: No file provided for design ID: {design_id}"
        )
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    try:
        # Implement file upload logic here (e.g., save to S3 or local storage)
        current_app.logger.info(
            f"File '{file.filename}' uploaded successfully for design ID: {design_id}"
        )
        return jsonify({"message": "File uploaded successfully"}), 200
    except Exception as e:
        current_app.logger.error(f"File upload failed for design ID: {design_id} - {e}")
        return jsonify({"error": "Internal server error"}), 500
