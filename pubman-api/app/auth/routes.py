from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from app.auth import bp
from app.extensions import db, bcrypt
from app.db_models.user import User


@bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    current_app.logger.info(f"Signup request received for username: {username}, email: {email}")

    # Basic validation
    if not username or not email or not password:
        current_app.logger.warning("Signup failed: Missing required fields")
        return jsonify({"error": "Missing required fields"}), 400

    if len(password) < 8:
        current_app.logger.warning("Signup failed: Password too short")
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    if not username.isalnum():
        current_app.logger.warning("Signup failed: Username must be alphanumeric")
        return jsonify({"error": "Username must be alphanumeric"}), 400

    if email.count("@") != 1 or "." not in email.split("@")[-1]:
        current_app.logger.warning("Signup failed: Invalid email format")
        return jsonify({"error": "Invalid email format"}), 400

    if User.query.filter_by(username=username).first():
        current_app.logger.warning(f"Signup failed: Username '{username}' already exists")
        return jsonify({"error": "Username already exists"}), 400

    if User.query.filter_by(email=email).first():
        current_app.logger.warning(f"Signup failed: Email '{email}' already exists")
        return jsonify({"error": "Email already exists"}), 400

    # Create new user
    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(username=username, email=email, password_hash=password_hash)
    db.session.add(new_user)
    try:
        db.session.commit()
        current_app.logger.info(f"User '{username}' created successfully")
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        current_app.logger.error(f"Signup failed: Database error - {e}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


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
