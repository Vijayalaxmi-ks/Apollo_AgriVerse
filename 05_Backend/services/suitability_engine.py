import pandas as pd
import os

# 1. Define the path to your KnowledgeBase folder
BASE_DIR = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"

# 2. Load all 5 CSVs into Pandas DataFrames, respecting the 'Cleaned' subfolder
try:
    # Notice the "Cleaned" folder added to the paths for the first two files
    df_crop = pd.read_csv(os.path.join(BASE_DIR, "Cleaned", "01_crop_database_cleaned.csv"))
    df_variety = pd.read_csv(os.path.join(BASE_DIR, "Cleaned", "02_crop_variety_database_cleaned.csv"))
    
    # The rest are directly in the KnowledgeBase folder
    df_soil = pd.read_csv(os.path.join(BASE_DIR, "03_soil_database_final.csv"))
    df_req = pd.read_csv(os.path.join(BASE_DIR, "04_crop_soil_requirements_final.csv"))
    df_climate = pd.read_csv(os.path.join(BASE_DIR, "05_region_climate_processed.csv"))
    
    print("✅ All 5 datasets loaded successfully into the Suitability Engine!")
except FileNotFoundError as e:
    print(f"❌ Error loading files: {e}. Please check your BASE_DIR path.")
    
    
    # 3. The Core Suitability Function
# 3. The Advanced Suitability Function
def calculate_suitability(farm_soil_id, farm_region_id, target_crop_id):
    try:
        farm_soil = df_soil[df_soil['soil_id'] == farm_soil_id].iloc[0]
        farm_climate = df_climate[df_climate['region_id'] == farm_region_id].iloc[0]
        crop_info = df_crop[df_crop['crop_id'] == target_crop_id].iloc[0]
    except IndexError:
        return {"error": "Invalid ID provided. Could not find data in CSVs."}

    # --- CLIMATE SCORING (Temperature Check) ---
    climate_score = 100
    avg_temp = farm_climate['average_temperature_c']
    
    if avg_temp < crop_info['min_temp_c'] or avg_temp > crop_info['max_temp_c']:
        climate_score -= 50 
    elif crop_info['opt_temp_min'] <= avg_temp <= crop_info['opt_temp_max']:
        climate_score = 100 
    else:
        climate_score -= 20 
        
    # --- BASIC SOIL SCORING (pH Check) ---
    soil_score = 100
    soil_ph = farm_soil['ph']
    
    if soil_ph < crop_info['ph_min'] or soil_ph > crop_info['ph_max']:
        soil_score -= 30 
        
    # --- ADVANCED SOIL SCORING (df_req Connection) ---
    # Look for a match between the crop and the user's specific soil type
    # We remove 'crop_' from the ID just in case df_req uses shorthand names like 'grape'
    crop_search_name = target_crop_id.replace("crop_", "")
    req_match = df_req[(df_req['crop_id'].str.contains(crop_search_name, case=False, na=False)) & 
                       (df_req['soil_type'] == farm_soil['soil_type'])]
    
    if not req_match.empty:
        req_data = req_match.iloc[0]
        
        # NPK Penalty Checks
        if farm_soil['nitrogen_mg_kg'] < req_data['nitrogen_min_mg_kg']:
            soil_score -= 10
        if farm_soil['phosphorus_mg_kg'] < req_data['phosphorus_min_mg_kg']:
            soil_score -= 10
        if farm_soil['potassium_mg_kg'] < req_data['potassium_min_mg_kg']:
            soil_score -= 10
            
        # Apply the master compatibility score (e.g., 0.88 * 100 = 88 points)
        expert_bonus = req_data['compatibility_score'] * 100
        
        # Average our calculated chemical score with the expert CSV score
        soil_score = (soil_score + expert_bonus) / 2
        
    # --- FINAL SCORE ---
    final_score = (climate_score + soil_score) / 2
    
    return {
        "crop_requested": crop_info['crop_name'],
        "climate_score": climate_score,
        "soil_score": soil_score,
        "overall_suitability": final_score
    }

# 4. Test the Advanced Engine!
print("\n--- Running Advanced Suitability Test ---")
# Let's test with grape, since we know we have requirements for grape in Black Soil!
test_result = calculate_suitability('SOIL_00001', 'REG_0002', 'crop_grape') 
print(test_result)

# 5. The Variety Recommendation Function
def recommend_varieties(farm_soil_id, farm_region_id, target_crop_id):
    # First, check if the general crop is suitable
    base_suitability = calculate_suitability(farm_soil_id, farm_region_id, target_crop_id)
    
    if "error" in base_suitability:
        return base_suitability
        
    if base_suitability['overall_suitability'] < 50:
        return {"message": f"{target_crop_id} is not suitable enough for this farm."}

    # Fetch farm climate and all varieties for this crop
    farm_climate = df_climate[df_climate['region_id'] == farm_region_id].iloc[0]
    varieties = df_variety[df_variety['crop_id'] == target_crop_id]
    
    recommendations = []
    
    for _, variety in varieties.iterrows():
        var_score = base_suitability['overall_suitability'] # Start with the base crop score
        
        # 1. Extreme Heat Check
        if farm_climate['maximum_temperature_c'] > variety['critical_temperature_max_c']:
            var_score -= 15 # Penalize if the region gets too hot for this specific variety
            
        # 2. Yield Bonus (Reward varieties with higher expected yields)
        # Adding a small bonus based on yield potential to rank them
        var_score += (variety['expected_yield_ton_ha'] * 0.1)
        
        recommendations.append({
            "variety_name": variety['variety_name'],
            "match_score": round(var_score, 1),
            "expected_yield_ton_ha": variety['expected_yield_ton_ha'],
            "market_demand": variety['market_demand']
        })
        
    # Sort the list so the highest score is at the top
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    
    return {
        "crop_requested": target_crop_id,
        "base_suitability": base_suitability['overall_suitability'],
        "top_variety_recommendations": recommendations[:3] # Give the top 3 choices
    }

# 6. Test the Variety Engine!
print("\n--- Running Variety Recommendation Test ---")
variety_results = recommend_varieties('SOIL_00001', 'REG_0002', 'crop_grape')
print(variety_results)