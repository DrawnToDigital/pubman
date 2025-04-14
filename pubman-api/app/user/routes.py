from flask import request, current_app, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import bcrypt, db
from app.db_model.user import User
from app.user import bp
from app.user.schema import UserSchema


@bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    current_app.logger.info(
        f"Signup request received for username: {username}, email: {email}"
    )

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
        current_app.logger.warning(
            f"Signup failed: Username '{username}' already exists"
        )
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


@bp.route("/my", methods=["POST"])
@jwt_required()
def get_user_info():
    username = get_jwt_identity()
    current_app.logger.info(f"User info request received for username: {username}")

    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.warning(f"User '{username}' not found")
        return jsonify({"error": "User not found"}), 404

    current_app.logger.info(f"User info retrieved for username: {username}")
    return jsonify(UserSchema().dump(user)), 200
