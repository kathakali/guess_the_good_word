"""Application factory for the Guess the Good Word Flask app."""

from __future__ import annotations


def create_app():
    """Create and configure the Flask application."""
    from flask import Flask

    from .routes import bp

    app = Flask(__name__)
    app.config.from_mapping(SECRET_KEY="local-development-key-change-if-publishing")
    app.register_blueprint(bp)

    @app.after_request
    def add_security_headers(response):
        """Add small, local-development-friendly security headers."""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers[
            "Content-Security-Policy"
        ] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none'"
        )
        return response

    return app
