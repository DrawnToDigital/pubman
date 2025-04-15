FROM adobe/s3mock:latest

ENTRYPOINT ["java", "-Dhttp.port=80", "-Dserver.port=443", "--illegal-access=warn", "-Djava.security.egd=file:/dev/./urandom", "-XX:+UseZGC", "-XX:+ZGenerational", "-jar", "s3mock.jar"]

EXPOSE 80 443