from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.db_model.design import Design
from app.db_model.user import User
from app.design.schema import DesignSchema
from app.extensions import db
from app.design import bp


@bp.route("/", methods=["GET"])
@jwt_required()
def list_designs():
    username = get_jwt_identity()
    current_app.logger.info(f"List designs request received for username: {username}")

    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.warning(f"User '{username}' not found")
        return jsonify({"error": "User not found"}), 404
    try:
        designs = Design.query.filter_by(user_id=user.id).all()
        current_app.logger.info(
            f"{len(designs)} designs retrieved for username: {username}"
        )
        return jsonify(DesignSchema(many=True).dump(designs)), 200
    except Exception as e:
        current_app.logger.error(
            f"Failed to retrieve designs for username: {username} - {e}"
        )
        return jsonify({"error": "Internal server error"}), 500


@bp.route("/", methods=["POST"])
@jwt_required()
def create_design():
    username = get_jwt_identity()
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")

    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.warning(f"User '{username}' not found")
        return jsonify({"error": "User not found"}), 404

    current_app.logger.info(
        f"Create design request received for username: {username} with name: {name}"
    )

    if not name:
        current_app.logger.warning(
            f"Create design failed: Missing 'name' for user ID: {username}"
        )
        return jsonify({"error": "Design name is required"}), 400

    try:
        new_design = Design(name=name, description=description, user_id=user.id)
        db.session.add(new_design)
        db.session.commit()
        current_app.logger.info(
            f"Design '{name}' created successfully for username: {username}"
        )
        return jsonify(DesignSchema().dump(new_design)), 201
    except Exception as e:
        current_app.logger.error(
            f"Failed to create design for username: {username} - {e}"
        )
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500
