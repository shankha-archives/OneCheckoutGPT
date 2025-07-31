from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import logging
import json
import re
from typing import Dict, Any, List, Optional
from langchain.memory import ConversationBufferMemory
import uuid
import openai
import aiofiles
import tempfile
from pydub import AudioSegment
import io

load_dotenv()

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# OpenAI client for Whisper
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load products/plans from CSV
try:
    devices_df = pd.read_csv("data/devices.csv")
    plans_df = pd.read_csv("data/plans.csv")
    logger.info(f"Loaded {len(devices_df)} devices and {len(plans_df)} plans")
except FileNotFoundError:
    logger.error("CSV files not found. Creating empty dataframes.")
    devices_df = pd.DataFrame(columns=["id", "name", "brand", "color", "storage", "price", "image", "features"])
    plans_df = pd.DataFrame(columns=["id", "name", "type", "price", "data", "features"])

# Azure OpenAI setup
try:
    chat_model = AzureChatOpenAI(
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        temperature=0.7,
    )
    
    # Test connection
    test_result = chat_model.invoke([HumanMessage(content="Hello")])
    logger.info("Azure OpenAI connection successful")
    azure_openai_available = True
    
except Exception as e:
    logger.error(f"Azure OpenAI initialization failed: {str(e)}")
    chat_model = None
    azure_openai_available = False

# Conversation memory storage
conversation_memories = {}
user_profiles = {}

# Enhanced user profile system
class UserProfile:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.budget_range = None
        self.usage_type = None  # heavy, moderate, light
        self.brand_preference = None
        self.important_features = []
        self.current_plan_type = None
        self.conversation_stage = "greeting"  # greeting, needs_assessment, recommendation, comparison, checkout
        self.preferences_collected = False
        self.recommended_devices = []
        self.selected_device = None
        self.selected_plan = None

def get_user_profile(session_id: str) -> UserProfile:
    if session_id not in user_profiles:
        user_profiles[session_id] = UserProfile(session_id)
    return user_profiles[session_id]

def get_conversation_memory(session_id: str = None):
    if not session_id or session_id not in conversation_memories:
        new_session_id = session_id or str(uuid.uuid4())
        conversation_memories[new_session_id] = ConversationBufferMemory()
        return new_session_id, conversation_memories[new_session_id]
    return session_id, conversation_memories[session_id]

# Health check
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Enhanced ShoppingGPT API with Whisper"}

@app.get("/api/devices")
def get_devices():
    if devices_df.empty:
        return []
    devices = devices_df.copy()
    devices["features"] = devices["features"].apply(
        lambda x: x.split(";") if isinstance(x, str) else []
    )
    return devices.to_dict(orient="records")

@app.get("/api/plans")
def get_plans():
    if plans_df.empty:
        return []
    plans = plans_df.copy()
    plans["features"] = plans["features"].apply(
        lambda x: x.split(";") if isinstance(x, str) else []
    )
    return plans.to_dict(orient="records")

# Whisper voice transcription endpoint
@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        if not audio.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.webm', '.ogg')):
            raise HTTPException(status_code=400, detail="Unsupported audio format")
        
        # Read the uploaded audio file
        audio_data = await audio.read()
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Use OpenAI Whisper for transcription
            with open(temp_file_path, "rb") as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en"
                )
            
            logger.info(f"Transcribed: {transcript.text}")
            return {"transcript": transcript.text, "success": True}
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def create_smart_system_prompt(user_profile: UserProfile, devices_context: str, plans_context: str, conversation_history: str) -> str:
    stage_prompts = {
        "greeting": """You are an expert mobile phone shopping assistant. Your goal is to understand the customer's needs through intelligent questioning and provide personalized recommendations.

CONVERSATION STAGE: Initial Greeting & Needs Assessment

Your approach:
1. Welcome the user warmly
2. Ask ONE specific question to understand their primary need
3. Based on their response, ask follow-up questions to understand:
   - Budget range
   - Usage patterns (heavy user, moderate, light)
   - Important features (camera, gaming, battery life, etc.)
   - Brand preferences
   - Current plan satisfaction

Be conversational and friendly. Don't overwhelm with multiple questions at once.""",

        "needs_assessment": f"""You are assessing the customer's needs. Based on the conversation, you know:
- Budget: {user_profile.budget_range or 'Not specified'}
- Usage: {user_profile.usage_type or 'Not specified'}
- Brand preference: {user_profile.brand_preference or 'Not specified'}
- Important features: {', '.join(user_profile.important_features) or 'Not specified'}

Ask intelligent follow-up questions to fill in missing information. Once you have enough info, move to recommendations.""",

        "recommendation": """You now have enough information to make smart recommendations. Provide 2-3 specific device and plan combinations that match their needs perfectly. Explain WHY each recommendation fits their requirements.""",

        "comparison": """The customer is comparing options. Help them understand the differences and guide them to the best choice for their specific needs.""",

        "checkout": """Guide the customer through the purchase process. Be encouraging and helpful."""
    }
    
    base_prompt = stage_prompts.get(user_profile.conversation_stage, stage_prompts["greeting"])
    
    return f"""{base_prompt}

{devices_context}

{plans_context}

CONVERSATION HISTORY:
{conversation_history}

IMPORTANT INSTRUCTIONS:
1. Be natural and conversational
2. Ask only ONE question at a time
3. Show genuine interest in their needs
4. Provide specific recommendations with reasoning
5. If recommending products, include device ID and plan ID
6. Guide the conversation naturally toward the next stage

Respond in JSON format:
{{
  "response": "Your conversational response",
  "question": "Specific question to ask (if any)",
  "devices": [
    {{
      "id": "device_id",
      "name": "device_name", 
      "reasoning": "why this device fits their needs"
    }}
  ],
  "plans": [
    {{
      "id": "plan_id",
      "name": "plan_name",
      "reasoning": "why this plan fits their needs"
    }}
  ],
  "conversation_stage": "current_stage",
  "voice_response": "Optimized response for speech synthesis",
  "next_action": "continue_conversation|show_products|navigate_to_cart|ask_clarification"
}}"""

def format_devices_for_prompt():
    devices_text = "AVAILABLE DEVICES:\n"
    for _, device in devices_df.iterrows():
        features = device["features"].split(";") if isinstance(device["features"], str) else []
        devices_text += f"ID:{device['id']} | {device['name']} ({device['brand']}) | €{device['price']} | {device['storage']} | Features: {', '.join(features)}\n"
    return devices_text

def format_plans_for_prompt():
    plans_text = "AVAILABLE PLANS:\n"
    for _, plan in plans_df.iterrows():
        features = plan["features"].split(";") if isinstance(plan["features"], str) else []
        plans_text += f"ID:{plan['id']} | {plan['name']} ({plan['type']}) | €{plan['price']}/month | {plan['data']} | Features: {', '.join(features)}\n"
    return plans_text

def update_user_profile_from_message(user_profile: UserProfile, user_message: str, ai_response: dict):
    """Extract user preferences from conversation"""
    message_lower = user_message.lower()
    
    # Extract budget
    import re
    budget_patterns = [
        r'budget.*?(\d+)',
        r'spend.*?(\d+)', 
        r'around.*?(\d+)',
        r'under.*?(\d+)',
        r'€(\d+)',
        r'(\d+).*euro'
    ]
    
    for pattern in budget_patterns:
        match = re.search(pattern, message_lower)
        if match:
            budget = int(match.group(1))
            if budget > 50:  # Likely device budget
                user_profile.budget_range = f"Under €{budget}"
            break
    
    # Extract usage patterns
    if any(word in message_lower for word in ['heavy', 'lot', 'gaming', 'streaming', 'work']):
        user_profile.usage_type = "heavy"
    elif any(word in message_lower for word in ['light', 'basic', 'simple', 'occasional']):
        user_profile.usage_type = "light"
    elif any(word in message_lower for word in ['moderate', 'normal', 'average']):
        user_profile.usage_type = "moderate"
    
    # Extract brand preferences
    brands = ['apple', 'iphone', 'samsung', 'galaxy', 'google', 'pixel', 'xiaomi', 'oneplus', 'nothing', 'motorola', 'sony']
    for brand in brands:
        if brand in message_lower:
            user_profile.brand_preference = brand.title()
            break
    
    # Extract features
    feature_keywords = {
        'camera': ['camera', 'photo', 'picture', 'photography'],
        'battery': ['battery', 'charging', 'long-lasting'],
        'gaming': ['gaming', 'games', 'performance'],
        'storage': ['storage', 'space', 'memory'],
        '5g': ['5g', 'fast internet', 'network']
    }
    
    for feature, keywords in feature_keywords.items():
        if any(keyword in message_lower for keyword in keywords):
            if feature not in user_profile.important_features:
                user_profile.important_features.append(feature)

@app.post("/api/chat")
async def enhanced_chat(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message", "")
        session_id = data.get("session_id", None)
        reset_conversation = data.get("reset", False)
        
        logger.info(f"Chat request: '{user_message}' | Session: {session_id}")
        
        # Handle reset
        if reset_conversation and session_id:
            if session_id in conversation_memories:
                del conversation_memories[session_id]
            if session_id in user_profiles:
                del user_profiles[session_id]
            return {"response": "New conversation started! How can I help you find the perfect phone and plan?", "session_id": session_id, "reset": True}
        
        # Get or create session
        session_id, memory = get_conversation_memory(session_id)
        user_profile = get_user_profile(session_id)
        
        # Mock response if Azure OpenAI unavailable
        if not azure_openai_available:
            return {
                "response": "I'm here to help you find the perfect phone and plan! What are you looking for?",
                "voice_response": "I'm here to help you find the perfect phone and plan! What are you looking for?",
                "session_id": session_id,
                "conversation_stage": "greeting"
            }
        
        # Prepare context
        devices_context = format_devices_for_prompt()
        plans_context = format_plans_for_prompt()
        history = memory.load_memory_variables({})
        history_text = history.get("history", "")
        
        # Create intelligent system prompt
        system_prompt = create_smart_system_prompt(user_profile, devices_context, plans_context, history_text)
        
        # Send to Azure OpenAI
        response = chat_model.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])
        
        # Update memory
        memory.save_context({"input": user_message}, {"output": response.content})
        
        # Parse AI response
        try:
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```|({[\s\S]*})', response.content)
            if json_match:
                json_str = json_match.group(1) or json_match.group(2)
                result = json.loads(json_str)
            else:
                result = {
                    "response": response.content,
                    "voice_response": response.content,
                    "conversation_stage": user_profile.conversation_stage,
                    "next_action": "continue_conversation"
                }
        except Exception as e:
            logger.error(f"JSON parsing error: {e}")
            result = {
                "response": response.content,
                "voice_response": response.content,
                "conversation_stage": user_profile.conversation_stage,
                "next_action": "continue_conversation"
            }
        
        # Update user profile
        update_user_profile_from_message(user_profile, user_message, result)
        
        # Update conversation stage if provided
        if "conversation_stage" in result:
            user_profile.conversation_stage = result["conversation_stage"]
        
        result["session_id"] = session_id
        return result
        
    except Exception as e:
        logger.exception(f"Chat error: {e}")
        return {
            "response": "I encountered an error. Let me try again - what can I help you find?",
            "voice_response": "I encountered an error. Let me try again - what can I help you find?",
            "error": str(e)
        }

# Text-to-speech endpoint (can be enhanced with better TTS later)
@app.post("/api/speak")
async def text_to_speech(request: Request):
    try:
        data = await request.json()
        text = data.get("text", "")
        
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        
        # For now, return the text for browser TTS
        # Later can be enhanced with OpenAI TTS API or other services
        return {"text": text, "audio_url": None}
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice-command")
async def handle_voice_command(request: Request):
    """Handle specific voice commands like navigation"""
    try:
        data = await request.json()
        command = data.get("command", "").lower()
        session_id = data.get("session_id")
        
        # Navigation commands
        if "cart" in command or "shopping cart" in command:
            return {
                "action": "navigate",
                "route": "/cart",
                "response": "Taking you to your shopping cart now!"
            }
        elif "checkout" in command:
            return {
                "action": "navigate", 
                "route": "/cart",
                "response": "Let's proceed to checkout!"
            }
        elif "home" in command or "catalog" in command:
            return {
                "action": "navigate",
                "route": "/",
                "response": "Returning to the product catalog!"
            }
        elif "help" in command:
            return {
                "response": "I can help you find phones, compare plans, add items to cart, or guide you through checkout. What would you like to do?",
                "action": "continue_conversation"
            }
        else:
            return {
                "response": "I didn't understand that command. Try saying 'go to cart', 'checkout', or 'help'.",
                "action": "continue_conversation"
            }
            
    except Exception as e:
        logger.error(f"Voice command error: {e}")
        return {
            "response": "Sorry, I didn't catch that. Could you repeat your request?",
            "action": "continue_conversation"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)