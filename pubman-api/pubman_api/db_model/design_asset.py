from pubman_api.extensions import db


class DesignAsset(db.Model):
    __tablename__ = "designs_assets"
    id = db.Column(db.Integer, primary_key=True)
    design_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    design = db.relationship(
        "Design",
        primaryjoin="DesignAsset.design_id == Design.id",
        foreign_keys=[design_id],
        backref="design_assets",
    )
    user = db.relationship(
        "User",
        primaryjoin="DesignAsset.user_id == User.id",
        foreign_keys=[user_id],
    )