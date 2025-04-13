from app.extensions import db


class Design(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    design_key = db.Column(db.String(8), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    user = db.relationship("User", backref=db.backref("designs", lazy=True))
