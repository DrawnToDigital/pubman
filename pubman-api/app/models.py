from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import db
from .db import Model, User

models_bp = Blueprint("models", __name__)


@models_bp.route("/", methods=["GET"])
@jwt_required()
def list_models():
    user_id = get_jwt_identity()
    models = Model.query.filter_by(user_id=user_id).all()
    return jsonify([model.to_dict() for model in models]), 200


@models_bp.route("/", methods=["POST"])
@jwt_required()
def create_model():
    user_id = get_jwt_identity()
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")

    new_model = Model(name=name, description=description, user_id=user_id)
    db.session.add(new_model)
    db.session.commit()

    return jsonify(new_model.to_dict()), 201


@models_bp.route("/<int:model_id>/upload", methods=["POST"])
@jwt_required()
def upload_file(model_id):
    # Implement file upload logic here
    pass
