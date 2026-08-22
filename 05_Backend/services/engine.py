from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# Import the engine you just built!
from services.suitability_engine import recommend_varieties

# Initialize the API
app = FastAPI(title="Apollo AgriVerse API", version="1.0")

# Define what the frontend needs to send us
class FarmRequest(BaseModel):
    soil_id: str
    region_id: str
    crop_id: str

# Create the endpoint URL
@app.post("/api/v1/recommend")
def get_recommendation(request: FarmRequest):
    # Pass the frontend's data into your engine
    result = recommend_varieties(request.soil_id, request.region_id, request.crop_id)
    return result

# Run the server
if __name__ == "__main__":
    print("🚀 Starting Apollo AgriVerse Backend Server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)