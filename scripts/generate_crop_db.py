import os
import csv

def create_crop_database():
    # Updated to the specific absolute path
    save_dir = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"
    os.makedirs(save_dir, exist_ok=True)
    
    file_path = os.path.join(save_dir, "01_crop_database.csv")
    
    # Define headers and data based on the provided snippet
    headers = [
        "crop_id", "crop_name", "botanical_name", "min_temp_c", 
        "max_temp_c", "opt_temp_min", "opt_temp_max", "ph_min", 
        "ph_max", "salinity_max_ec"
    ]
    
    data = [
        ["crop_grape", "Grape", "Vitis vinifera", 10.0, 40.0, 20.0, 32.0, 6.0, 8.5, 2.0]
    ]
    
    # Write to CSV
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        writer.writerows(data)
        
    print(f"Successfully created: {file_path}")

if __name__ == "__main__":
    create_crop_database()