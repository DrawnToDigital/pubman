from app.db_models.design import Design
from app.extensions import ma

class DesignSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Design
        exclude = ('id', 'user_id')