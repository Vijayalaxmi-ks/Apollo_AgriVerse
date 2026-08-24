/** Apollo Agriverse — master catalog (locations + crops) */

export const INDIAN_LOCATIONS: Record<string, string[]> = {
  Maharashtra: [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana',
    'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
    'Kolhapur', 'Latur', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad',
    'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
    'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
  ],
  Gujarat: ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Junagadh', 'Bhavnagar'],
  Karnataka: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Ballari', 'Dharwad'],
  Punjab: ['Ludhiana', 'Amritsar', 'Bathinda', 'Jalandhar', 'Patiala'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'Uttar Pradesh': ['Lucknow', 'Meerut', 'Varanasi', 'Kanpur Nagar', 'Agra'],
};

export const CROPS_CATALOG: Record<string, string[]> = {
  'Grapes & Viticulture': [
    'Grape (Thompson Seedless)', 'Grape (Sonaka)', 'Grape (Sharad Seedless / Black)',
    'Grape (Tas-A-Ganesh)', 'Grape (Manik Chaman)', 'Grape (Flame Seedless / Red)',
  ],
  Horticulture: [
    'Pomegranate (Bhagwa)', 'Mango (Alphonso)', 'Banana (Grand Naine)', 'Onion (Red / Nasik)',
  ],
  'Cash & Fiber': ['Cotton (Bt Cotton)', 'Sugarcane (Co 86032)'],
  'Cereals & Oilseeds': ['Wheat (Sharbati)', 'Soybean', 'Maize (Corn)'],
  Vegetables: ['Tomato (Hybrid)', 'Potato (Kufri Jyoti)', 'Green Chili'],
  Spices: ['Turmeric (Rajapore)', 'Cumin (Jeera)'],
};

export const SEASONS = ['Kharif 2025', 'Rabi 2024-25', 'Summer 2025', 'Annual 2024-25'];

export function getAllStates(): string[] {
  return Object.keys(INDIAN_LOCATIONS).sort();
}

export function getCities(state: string): string[] {
  return [...(INDIAN_LOCATIONS[state] || [])].sort();
}

export function getAllCropsFlat(): string[] {
  const all = Object.values(CROPS_CATALOG).flat();
  const grapes = all
    .filter((c) => /grape/i.test(c))
    .sort((a, b) => a.localeCompare(b));
  const others = all
    .filter((c) => !/grape/i.test(c))
    .sort((a, b) => a.localeCompare(b));
  // Grape varieties first (priority), then remaining crops A–Z
  return [...grapes, ...others];
}

export function getCropCategories(): string[] {
  return Object.keys(CROPS_CATALOG).sort();
}
