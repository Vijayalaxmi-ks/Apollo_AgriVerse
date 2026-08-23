import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / ".env")


class Settings:

  PORT: int = int(os.getenv("PORT", 8000))
  HOST: str = os.getenv("HOST", "0.0.0.0")
  OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
  AGMARKNET_API_KEY: str = os.getenv("AGMARKNET_API_KEY", "")
  CORS_ORIGINS: list = os.getenv(
      "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
  ).split(",")


settings = Settings()