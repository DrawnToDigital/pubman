from app.db_models.user import User
from app.extensions import ma

from marshmallow_sqlalchemy.fields import Related


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User

    username = ma.auto_field()
    email = ma.auto_field()
    status = ma.auto_field()