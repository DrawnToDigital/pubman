from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from app.auth import bp
from app.extensions import bcrypt
from app.db_models.user import User


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    current_app.logger.info(f"Login request received for username: {username}")

    if not username or not password:
        current_app.logger.warning("Login failed: Missing username or password")
        return jsonify({"error": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        current_app.logger.warning(f"Login failed: Invalid credentials for username '{username}'")
        return jsonify({"error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=username)
    refresh_token = create_refresh_token(identity=username)
    current_app.logger.info(f"User '{username}' logged in successfully")
    return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200


@bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    username = get_jwt_identity()
    current_app.logger.info(f"Token refresh request received for username: {username}")

    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.warning(f"Token refresh failed: User '{username}' not found")
        return jsonify({"error": "User not found"}), 404
    if user.status != "active":
        current_app.logger.warning(f"Token refresh failed: User '{username}' ID {user.id} is inactive")
        return jsonify({"error": "User is inactive"}), 403
    try:
        access_token = create_access_token(identity=username)
        current_app.logger.info(f"Token refreshed successfully for username: {username} ID {user.id}")
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh failed for username: {username} ID {user.id} - {e}")
        return jsonify({"error": "Internal server error"}), 500
