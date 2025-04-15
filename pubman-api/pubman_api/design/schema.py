from pubman_api.db_model.design import Design
from pubman_api.extensions import ma


class DesignSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Design
        exclude = ("id", "user_id")
