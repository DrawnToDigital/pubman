from pubman_api.extensions import ma
from pubman_api.db_model.designer import Designer


class DesignerSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Designer

    username = ma.auto_field()
    email = ma.auto_field()
    status = ma.auto_field()
