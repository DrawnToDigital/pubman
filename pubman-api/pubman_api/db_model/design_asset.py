from pubman_api.extensions import db


class DesignAsset(db.Model):
    __tablename__ = "design_asset"
    id = db.Column(db.Integer, primary_key=True)
    design_id = db.Column(db.Integer, nullable=False)
    designer_id = db.Column(db.Integer, nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True, default=None)

    design = db.relationship(
        "Design",
        primaryjoin="DesignAsset.design_id == Design.id",
        foreign_keys=[design_id],
        backref="design_assets",
    )
    designer = db.relationship(
        "Designer",
        primaryjoin="DesignAsset.designer_id == Designer.id",
        foreign_keys=[designer_id],
    )
