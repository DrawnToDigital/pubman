from pubman_api.extensions import db


class Designer(db.Model):
    __tablename__ = "designer"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default="active")
    email = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
    deleted_at = db.Column(db.DateTime, nullable=True)

    # designs: backref to db_model.Design
