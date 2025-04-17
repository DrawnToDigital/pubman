from flask import request, current_app, jsonify
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required,
    create_refresh_token,
    create_access_token,
)

from pubman_api.extensions import bcrypt, db
from pubman_api.db_model.designer import Designer
from pubman_api.designer import bp
from pubman_api.designer.schema import DesignerSchema


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

    if Designer.query.filter_by(username=username).first():
        current_app.logger.warning(
            f"Signup failed: Username '{username}' already exists"
        )
        return jsonify({"error": "Username already exists"}), 400

    if Designer.query.filter_by(email=email).first():
        current_app.logger.warning(f"Signup failed: Email '{email}' already exists")
        return jsonify({"error": "Email already exists"}), 400

    # Create new designer
    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_designer = Designer(username=username, email=email, password_hash=password_hash)
    db.session.add(new_designer)
    try:
        db.session.commit()
        current_app.logger.info(f"Designer '{username}' created successfully")

        access_token = create_access_token(identity=username)
        refresh_token = create_refresh_token(identity=username)
        return (
            jsonify(
                {
                    "message": "Designer created successfully",
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                }
            ),
            201,
        )
    except Exception as e:
        current_app.logger.error(f"Signup failed: Database error - {e}")
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@bp.route("/my", methods=["GET"])
@jwt_required()
def get_user_info():
    username = get_jwt_identity()
    current_app.logger.info(f"Designer info request received for username: {username}")

    designer = Designer.query.filter_by(username=username, deleted_at=None, status='active').first()
    if not designer:
        current_app.logger.warning(f"Designer '{username}' not found")
        return jsonify({"error": "Designer not found"}), 404

    current_app.logger.info(f"Designer info retrieved for username: {username}")
    return jsonify(DesignerSchema().dump(designer)), 200
