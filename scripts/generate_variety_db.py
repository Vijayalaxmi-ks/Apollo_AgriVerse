import os
import csv

def create_variety_database():
    # Updated to the specific absolute path
    save_dir = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"
    os.makedirs(save_dir, exist_ok=True)
    
    file_path = os.path.join(save_dir, "02_crop_variety_database.csv")
    
    # Define headers
    headers = [
        "variety_id", "crop_id", "variety_name", "preferred_soil_id", 
        "critical_flowering_moisture_pct", "hydrogel_dosage_kg_ha", "heat_tolerance_index"
    ]
    
    # Define data including the baseline varieties and the new high-yield addition
    data = [
        ["grape_thompson", "crop_grape", "Thompson Seedless", "black_cotton", 35.0, 3.0, 0.85],
        ["grape_tas_a_ganesh", "crop_grape", "Tas-A-Ganesh", "black_cotton", 32.0, 2.5, 0.90],
        ["grape_sharad", "crop_grape", "Sharad Seedless", "red_loam", 35.0, 3.5, 0.75],
        ["grape_manjari_naveen", "crop_grape", "Manjari Naveen", "alluvial_soil", 30.0, 2.0, 0.80],
        ["grape_manjari_shyama", "crop_grape", "Manjari Shyama", "alluvial_soil", 30.0, 2.5, 0.80],
        
        # High yield & profit variety for Maharashtra
        ["grape_super_sonaka", "crop_grape", "Super Sonaka", "black_cotton", 33.0, 2.8, 0.95]
    ]
    
    # Write to CSV
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        writer.writerows(data)
        
    print(f"Successfully created: {file_path}")

if __name__ == "__main__":
    create_variety_database()