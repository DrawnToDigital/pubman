from pubman_api.extensions import db


class Design(db.Model):
    __tablename__ = "design"
    id = db.Column(db.Integer, primary_key=True)
    designer_id = db.Column(db.Integer, nullable=False)
    design_key = db.Column(db.String(8), unique=True, nullable=False)
    main_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )
    deleted_at = db.Column(db.DateTime, nullable=True)

    designer = db.relationship(
        "Designer",
        primaryjoin="Design.designer_id == Designer.id",
        foreign_keys=[designer_id],
        backref="designs",
    )
