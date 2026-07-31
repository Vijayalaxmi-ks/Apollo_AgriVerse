import requests
import pandas as pd

# Coordinates for your project region (You can change lat and lon to match your exact farm location)
lat = 17.6599  # Example latitude (e.g., Solapur region)
lon = 75.9064  # Example longitude

# Querying SoilGrids REST API for key soil properties (pH, Nitrogen, Soil Organic Carbon)
url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lat={lat}&lon={lon}&property=phh2o&property=nitrogen&property=soc"

response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    layers = data['properties']['layers']
    extracted_data = []
    
    for layer in layers:
        name = layer['name']
        for depth_interval in layer['depths']:
            depth_label = depth_interval['label']
            mean_value = depth_interval['values']['mean']
            extracted_data.append({
                'property': name,
                'depth': depth_label,
                'value': mean_value
            })
            
    # Convert data into a table (DataFrame)
    df = pd.DataFrame(extracted_data)
    
    # Save directly as a CSV file inside your 02_Datasets folder
    df.to_csv('02_Datasets/soilgrids_data.csv', index=False)
    print("Success! Your soil CSV file has been created and saved in 02_Datasets/soilgrids_data.csv")
else:
    print("Error connecting to SoilGrids. Check your internet connection.")