from flask import current_app

from pubman_api.db_model.design_asset import DesignAsset
from pubman_api.extensions import ma
from pubman_api.storage.s3 import s3_client


class DesignAssetSchema(ma.SQLAlchemySchema):
    class Meta:
        model = DesignAsset
        execlude = ("id", "design_id", "user_id")

    file_name = ma.auto_field()
    mime_type = ma.auto_field()
    url = ma.Method("get_presigned_url", dump_only=True)

    def get_presigned_url(self, obj):
        s3 = s3_client()
        bucket_name = current_app.config["STORAGE_BUCKET"]
        try:
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": obj.file_path},
                ExpiresIn=3600,  # URL valid for 1 hour
            )
        except Exception as e:
            current_app.logger.error(f"Failed to generate presigned URL: {e}")
            return None
