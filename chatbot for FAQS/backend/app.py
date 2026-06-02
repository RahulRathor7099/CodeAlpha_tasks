import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Relative paths setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FAQ_DATA_PATH = os.path.join(BASE_DIR, "faq_data.json")
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Ensure frontend directory exists
os.makedirs(FRONTEND_DIR, exist_ok=True)

# Import the NLP Matcher engine
from nlp_engine import FAQMatcher

# Initialize NLP model
try:
    matcher = FAQMatcher(FAQ_DATA_PATH)
    print(f"NLP FAQ Matcher successfully initialized with {len(matcher.faqs)} FAQ records.")
except Exception as e:
    print(f"Error initializing FAQMatcher: {e}")
    matcher = None

# Initialize FastAPI
app = FastAPI(
    title="Aura AI FAQ Chatbot API",
    description="Backend NLP API for parsing customer questions and returning semantic FAQ matches.",
    version="1.0.0"
)

# Enable CORS for direct front-end file usage (e.g. file:/// or different dev servers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema
class ChatRequest(BaseModel):
    message: str

# Endpoints
@app.get("/api/health")
def health_check():
    return {"status": "online", "model_loaded": matcher is not None}

@app.get("/api/faqs")
def get_faqs():
    """Serves the complete FAQ database to display in the frontend explorer panel."""
    if not matcher:
        raise HTTPException(status_code=500, detail="FAQ engine not initialized")
    return matcher.faqs

@app.post("/api/chat")
def query_chatbot(request: ChatRequest):
    """Processes user query, applies NLTK text processing, calculates similarity, and yields results."""
    if not matcher:
        raise HTTPException(status_code=500, detail="FAQ engine not initialized")
    
    query = request.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    print(f"\n[API Chat] Incoming Query: '{query}'")
    
    # Use matching model to retrieve match
    match_result = matcher.match(query)
    
    matched_q = match_result["match"]["question"] if match_result["match"] else "None"
    print(f"[API Chat] Match Score: {match_result['score']} | Matched FAQ: '{matched_q}'")
    
    return {
        "query": query,
        "match": match_result["match"],
        "score": match_result["score"],
        "suggested": match_result.get("suggested"),
        "alternatives": match_result["alternatives"]
    }

# Mount static frontend files
# This allows serving the frontend directly from http://localhost:8000/
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    # Start the Uvicorn server (port 8000)
    print("Launching Aura AI Chatbot server on http://localhost:8000...")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
