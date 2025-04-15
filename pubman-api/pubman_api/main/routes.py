from pubman_api.main import bp


@bp.route("/", methods=["GET"])
def index():
    return {"message": "PubMan API"}, 200


# Basic health check route
@bp.route("/health", methods=["GET"])
def health_check():
    return {"status": "healthy"}, 200
