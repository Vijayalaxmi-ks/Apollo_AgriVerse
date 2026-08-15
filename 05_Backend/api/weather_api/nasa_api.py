import requests
from datetime import datetime, timedelta

def is_within_india(latitude: float, longitude: float) -> bool:
    """Checks if the coordinates fall roughly within India's boundary."""
    LAT_MIN, LAT_MAX = 6.0, 37.5
    LON_MIN, LON_MAX = 68.0, 97.5
    return LAT_MIN <= latitude <= LAT_MAX and LON_MIN <= longitude <= LON_MAX

def clean_nasa_value(value):
    """NASA uses -999.0 as a fill value for missing data. Convert to 0.0."""
    if value is None or value == -999.0 or value == -999:
        return 0.0
    return value

def get_nasa_weather(latitude: float, longitude: float):
    if not is_within_india(latitude, longitude):
        return {
            "status": "error",
            "message": "Coordinates outside India boundary."
        }

    url = "https://power.larc.nasa.gov/api/temporal/hourly/point"

    # Dynamic date offset (~3 days lag for NASA POWER)
    latest_available_date = datetime.utcnow() - timedelta(days=3)
    formatted_date = latest_available_date.strftime("%Y%m%d")

    params = {
        "parameters": "T2M,RH2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": formatted_date,
        "end": formatted_date,
        "format": "JSON"
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        parameters = data["properties"]["parameter"]
        latest_time = sorted(parameters["T2M"].keys())[-1]

        return {
            "status": "success",
            "country": "India",
            "source": "NASA POWER AG",
            "latitude": latitude,
            "longitude": longitude,
            "date": formatted_date,
            "utc_hour": latest_time[-2:],
            "weather": {
                "temperature_c": clean_nasa_value(parameters["T2M"].get(latest_time)),
                "humidity_pct": clean_nasa_value(parameters["RH2M"].get(latest_time)),
                "rainfall_mm": clean_nasa_value(parameters["PRECTOTCORR"].get(latest_time)),
                "wind_speed_m_s": clean_nasa_value(parameters["WS2M"].get(latest_time)),
                "solar_radiation_w_m2": clean_nasa_value(parameters["ALLSKY_SFC_SW_DWN"].get(latest_time))
            }
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to fetch weather data from NASA: {str(e)}"
        }

if __name__ == "__main__":
    print(get_nasa_weather(17.66, 75.91))