"""
Apollo Agriverse - Master Enterprise Catalog (Pan-India)
Complete geospatial mapping (all 36 Maharashtra Districts + major Indian states)
and an Agmarknet/FAO-aligned crop taxonomy.
"""

from typing import List, Dict

# ==============================================================================
# 1. PAN-INDIA GEOSPATIAL CATALOG
# ==============================================================================
INDIAN_LOCATIONS: Dict[str, List[str]] = {
    "Maharashtra": [
        "Ahmednagar (Ahilyanagar)", "Akola", "Amravati", 
        "Aurangabad (Chhatrapati Sambhajinagar)", "Beed", "Bhandara", "Buldhana", 
        "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", 
        "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", 
        "Nanded", "Nandurbar", "Nashik", "Osmanabad (Dharashiv)", "Palghar", 
        "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", 
        "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
    ],
    "Gujarat": [
        "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", 
        "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", 
        "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kutch", "Kheda", 
        "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", 
        "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", 
        "Tapi", "Vadodara", "Valsad"
    ],
    "Karnataka": [
        "Bagalkot", "Ballari (Bellary)", "Belagavi (Belgaum)", "Bengaluru Rural", 
        "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", 
        "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", 
        "Hassan", "Haveri", "Kalaburagi (Gulbarga)", "Kodagu", "Kolar", "Koppal", 
        "Mandya", "Mysuru (Mysore)", "Raichur", "Ramanagara", "Shivamogga (Shimoga)", 
        "Tumakuru (Tumkur)", "Udupi", "Uttara Kannada", "Vijayapura (Bijapur)", "Yadgir"
    ],
    "Punjab": [
        "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", 
        "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", 
        "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", 
        "Sahibzada Ajit Singh Nagar (Mohali)", "Sangrur", "Shahid Bhagat Singh Nagar", 
        "Sri Muktsar Sahib", "Tarn Taran"
    ],
    "Madhya Pradesh": [
        "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", 
        "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", 
        "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", 
        "Hoshangabad (Narmadapuram)", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", 
        "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", 
        "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", 
        "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", 
        "Ujjain", "Umaria", "Vidisha"
    ],
    "Uttar Pradesh": [
        "Agra", "Aligarh", "Prayagraj (Allahabad)", "Bareilly", "Bijnor", "Bulandshahr", 
        "Etawah", "Faizabad (Ayodhya)", "Firozabad", "Ghaziabad", "Gorakhpur", 
        "Jhansi", "Kanpur Nagar", "Lakhimpur Kheri", "Lucknow", "Mathura", "Meerut", 
        "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Saharanpur", "Shahjahanpur", 
        "Sitapur", "Varanasi"
    ],
    "Haryana": [
        "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", 
        "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", 
        "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", 
        "Sonipat", "Yamunanagar"
    ],
    "Andhra Pradesh": [
        "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", 
        "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", 
        "West Godavari", "YSR Kadapa"
    ],
    "Telangana": [
        "Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", 
        "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", 
        "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", 
        "Medak", "Medchal-Malkajgiri", "Nalgonda", "Nizamabad", "Peddapalli", 
        "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
        "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
    ],
    "Rajasthan": [
        "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", 
        "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", 
        "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", 
        "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", 
        "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"
    ],
    "Tamil Nadu": [
        "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", 
        "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", 
        "Krishnagiri", "Madurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", 
        "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", 
        "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", 
        "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
    ]
}

# ==============================================================================
# 2. MASTER CROP ONTOLOGY (AGMARKNET & FAO ALIGNED)
# ==============================================================================
CROPS_CATALOG: Dict[str, List[str]] = {
    "Grapes & Viticulture": [
        "Grape (Thompson Seedless)", "Grape (Sonaka)", "Grape (Sharad Seedless / Black)", 
        "Grape (Tas-A-Ganesh)", "Grape (Manik Chaman)", "Grape (Flame Seedless / Red)", 
        "Grape (Bangalore Blue)", "Grape (Anab-e-Shahi)", "Grape (Dilkhush)", 
        "Grape (Crimson Seedless)", "Grape (Cabernet Sauvignon - Wine)", 
        "Grape (Shiraz - Wine)", "Grape (Chenin Blanc - Wine)", "Grape (Sauvignon Blanc - Wine)",
        "Grape (General / Green)", "Grape (General / Black)"
    ],
    "Cereals, Food Grains & Millets": [
        "Wheat (Kalyansona)", "Wheat (Sharbati)", "Wheat (Durum)", "Wheat (Desi)", 
        "Paddy (Dhan)", "Rice (Basmati)", "Rice (Non-Basmati)", "Maize (Corn)", 
        "Jowar (Sorghum)", "Bajra (Pearl Millet)", "Ragi (Finger Millet)", "Barley", 
        "Buckwheat", "Amaranthus", "Oats", "Proso Millet", "Foxtail Millet", "Kodo Millet",
        "Barnyard Millet", "Little Millet"
    ],
    "Pulses (Legumes)": [
        "Gram (Chana / Chickpea)", "Pigeon Pea (Tur / Arhar)", "Green Gram (Moong)", 
        "Black Gram (Urad)", "Lentil (Masoor)", "Peas (Matar)", "Cowpea (Lobia)", 
        "Moth Bean", "Horse Gram (Kulthi)", "Rajma (Kidney Bean)", "Bengal Gram"
    ],
    "Oilseeds": [
        "Soybean", "Groundnut (Peanut)", "Mustard Seed", "Rapeseed", "Sunflower Seed", 
        "Safflower Seed (Kardi)", "Sesame (Til)", "Castor Seed", "Linseed (Alsi)", 
        "Niger Seed (Ramtil)", "Cotton Seed", "Copra (Dried Coconut)"
    ],
    "Cash, Commercial & Fiber Crops": [
        "Cotton (Bt Cotton)", "Cotton (Desi)", "Sugarcane (Co 86032)", "Sugarcane (Gur / Jaggery)", 
        "Jute", "Mesta", "Tobacco", "Guar Seed", "Isabgol (Psyllium)", "Arecanut (Betelnut)"
    ],
    "Horticulture (Fruits)": [
        "Mango (Alphonso)", "Mango (Kesar)", "Mango (Dasheri)", "Mango (Totapuri)", 
        "Pomegranate (Bhagwa)", "Pomegranate (Arakta)", "Banana (Grand Naine)", "Banana (Robusta)", 
        "Citrus (Nagpur Mandarin)", "Sweet Lime (Mosambi)", "Lemon", "Apple (Royal Delicious)", 
        "Guava (L-49)", "Guava (Allahabad Safeda)", "Papaya (Red Lady)", "Sapota (Chikoo)", 
        "Pineapple", "Watermelon", "Muskmelon", "Custard Apple (Sitaphal)", "Litchi", 
        "Strawberry", "Dragon Fruit", "Plum", "Peach", "Pear"
    ],
    "Vegetables": [
        "Onion (Red / Nasik)", "Onion (White)", "Onion (Pusa Red)", "Potato (Kufri Jyoti)", 
        "Potato (Chipsona)", "Tomato (Hybrid)", "Tomato (Desi)", "Green Chili", "Garlic", 
        "Ginger (Green)", "Brinjal (Eggplant)", "Cabbage", "Cauliflower", "Okra (Lady Finger)", 
        "Capsicum (Bell Pepper)", "Bitter Gourd", "Bottle Gourd", "Sponge Gourd", 
        "Ridge Gourd", "Pumpkin", "Carrot", "Radish", "Spinach", "Fenugreek (Methi Leaves)", 
        "Coriander Leaves", "Cluster Beans (Gawar)", "French Beans", "Drumstick"
    ],
    "Spices & Condiments": [
        "Turmeric (Salem)", "Turmeric (Rajapore)", "Cumin (Jeera)", "Coriander Seed (Dhania)", 
        "Black Pepper", "Cardamom (Small)", "Cardamom (Large)", "Clove", "Nutmeg", 
        "Mace", "Cinnamon", "Fenugreek Seed (Methi)", "Fennel (Saunf)", "Ajwain", 
        "Mustard (Rai)", "Dry Chili (Teja / Guntur)", "Tamarind", "Asafoetida (Hing)"
    ],
    "Plantation Crops": [
        "Tea", "Coffee (Arabica)", "Coffee (Robusta)", "Rubber", "Coconut", "Cashewnut", "Cocoa"
    ],
    "Medicinal & Aromatics": [
        "Ashwagandha", "Aloe Vera", "Tulsi", "Mint (Pudina)", "Lemongrass", "Safed Musli", "Stevia"
    ]
}

# ==============================================================================
# 3. QUERY HELPER CLASS
# ==============================================================================
class ApolloDropdownManager:
    @staticmethod
    def get_all_states() -> List[str]:
        return sorted(list(INDIAN_LOCATIONS.keys()))

    @staticmethod
    def get_cities_by_state(state: str) -> List[str]:
        return sorted(INDIAN_LOCATIONS.get(state, []))

    @staticmethod
    def get_all_cities_flat() -> List[str]:
        cities = []
        for city_list in INDIAN_LOCATIONS.values():
            cities.extend(city_list)
        return sorted(list(set(cities)))

    @staticmethod
    def get_crop_categories() -> List[str]:
        return sorted(list(CROPS_CATALOG.keys()))

    @staticmethod
    def get_crops_by_category(category: str) -> List[str]:
        return sorted(CROPS_CATALOG.get(category, []))

    @staticmethod
    def get_all_crops_flat() -> List[str]:
        crops = []
        for crop_list in CROPS_CATALOG.values():
            crops.extend(crop_list)
        return sorted(list(set(crops)))