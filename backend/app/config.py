from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    firebase_credentials_path: str | None = None
    firebase_database_url: str | None = None
    gemini_api_key: str | None = None
    n8n_webhook_url: str | None = None
    cors_origins: str = "https://hydro-mind-ai.vercel.app,http://localhost:5173,http://localhost:3000"
    models_dir: str = "models_artifacts"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
