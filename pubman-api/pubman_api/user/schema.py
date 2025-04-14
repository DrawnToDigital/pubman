from pubman_api.db_model.user import User
from pubman_api.extensions import ma

from marshmallow_sqlalchemy.fields import Related


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User

    username = ma.auto_field()
    email = ma.auto_field()
    status = ma.auto_field()
