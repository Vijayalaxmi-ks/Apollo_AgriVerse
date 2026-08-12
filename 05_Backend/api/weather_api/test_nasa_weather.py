import requests

url = "https://power.larc.nasa.gov/api/temporal/daily/point"

params = {
    "parameters": "T2M,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
    "community": "AG",
    "longitude": 73.78,
    "latitude": 20.00,
    "start": "20260801",
    "end": "20260805",
    "format": "JSON"
}

response = requests.get(url, params=params, timeout=30)

print("Status Code:", response.status_code)

if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print("API request failed")
    print(response.text)