from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    firebase_credentials_path: str | None = None
    firebase_database_url: str | None = None
    gemini_api_key: str | None = None
    n8n_webhook_url: str | None = None
    cors_origins: str = "https://hydro-mind-ai.vercel.app,http://localhost:5173,http://localhost:3000"
    models_dir: str = "models_artifacts"

    # SMTP email settings (optional — alerts are logged locally if unset)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None      # e.g. your.email@gmail.com
    smtp_password: str | None = None  # Gmail App Password (not account password)
    alert_from_email: str = "HydroMind AI <alerts@hydromind.ai>"
    alert_to_email: str | None = None # fallback recipient if officer email not found

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)


settings = Settings()
