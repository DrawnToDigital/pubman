from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from pubman_api.auth import bp
from pubman_api.extensions import bcrypt
from pubman_api.db_model.designer import Designer


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    current_app.logger.info(f"Login request received for username: {username}")

    if not username or not password:
        current_app.logger.warning("Login failed: Missing username or password")
        return jsonify({"error": "Missing username or password"}), 400

    designer = Designer.query.filter_by(username=username, deleted_at=None, status='active').first()
    if not designer or not bcrypt.check_password_hash(designer.password_hash, password):
        current_app.logger.warning(
            f"Login failed: Invalid credentials for username '{username}'"
        )
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=username)
    refresh_token = create_refresh_token(identity=username)
    current_app.logger.info(f"Designer '{username}' logged in successfully")
    return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200


@bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    username = get_jwt_identity()
    current_app.logger.info(f"Token refresh request received for username: {username}")

    designer = Designer.query.filter_by(username=username, deleted_at=None, status='active').first()
    if not designer:
        current_app.logger.warning(
            f"Token refresh failed: Designer '{username}' not found"
        )
        return jsonify({"error": "Designer not found"}), 404
    if designer.status != "active":
        current_app.logger.warning(
            f"Token refresh failed: Designer '{username}' ID {designer.id} is inactive"
        )
        return jsonify({"error": "Designer is inactive"}), 403
    try:
        access_token = create_access_token(identity=username)
        current_app.logger.info(
            f"Token refreshed successfully for username: {username} ID {designer.id}"
        )
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        current_app.logger.error(
            f"Token refresh failed for username: {username} ID {designer.id} - {e}"
        )
        return jsonify({"error": "Internal server error"}), 500
