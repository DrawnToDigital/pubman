from pubman_api.extensions import db


class Design(db.Model):
    __tablename__ = "designs"
    id = db.Column(db.Integer, primary_key=True)
    design_key = db.Column(db.String(8), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, nullable=False)

    user = db.relationship(
        "User", primaryjoin="Design.user_id == User.id", foreign_keys=[user_id], backref="designs",
    )
