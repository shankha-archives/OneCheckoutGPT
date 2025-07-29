from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
from dotenv import load_dotenv
from langchain_community.chat_models import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import logging
import json
import re
from typing import Dict, Any, List, Optional
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
import uuid
from fastapi import Depends
from openai.types import embedding_model

load_dotenv()

app = FastAPI()

# CORS for frontend - explicitly add localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load products/plans from CSV - use try/except to catch file not found errors
try:
    devices_df = pd.read_csv("data/devices.csv")
    plans_df = pd.read_csv("data/plans.csv")
except FileNotFoundError:
    import os
    print(f"Current working directory: {os.getcwd()}")
    print("Error: CSV files not found. Make sure data/devices.csv and data/plans.csv exist.")
    # Create empty dataframes as fallback
    devices_df = pd.DataFrame(columns=["id", "name", "brand", "color", "storage", "price", "image", "features"])
    plans_df = pd.DataFrame(columns=["id", "name", "type", "price", "data", "features"])

# First, add this import if not already present
from langchain.schema import HumanMessage, SystemMessage

# Azure OpenAI LangChain setup - More robust initialization
try:
    # Log environment variables for debugging (mask sensitive parts)
    logger.info(f"Azure OpenAI Endpoint: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
    logger.info(f"Azure OpenAI Deployment: {os.getenv('AZURE_OPENAI_DEPLOYMENT')}")
    logger.info(f"API Version: {os.getenv('AZURE_OPENAI_API_VERSION')}")
    logger.info(f"API Key present: {'Yes' if os.getenv('AZURE_OPENAI_API_KEY') else 'No'}")
    
    # Initialize Azure OpenAI models with fallback for API version
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-05-15")
    
    # Override with environment variable that LangChain expects
    os.environ["OPENAI_API_VERSION"] = api_version
    
    chat_model = AzureChatOpenAI(
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=api_version,
        temperature=0.7,  # Higher temperature for more creative responses
    )

    # Test the connection with a simple prompt
    test_message = "Hello, this is a test."
    test_result = chat_model.invoke([HumanMessage(content=test_message)])
    logger.info(f"Test message sent: '{test_message}', Response: '{test_result.content}'")
    
    logger.info("Azure OpenAI chat model initialized successfully")
    azure_openai_available = True
    
except Exception as e:
    logger.error(f"Error initializing Azure OpenAI chat model: {str(e)}")
    logger.exception(e)  # This logs the full stack trace
    chat_model = None
    azure_openai_available = False

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "ok", "message": "ShoppingGPT API is running"}

@app.get("/api/devices")
def get_devices():
    if devices_df.empty:
        return []
    devices = devices_df.copy()
    # Handle case where features might be missing or not a string
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

# Test the Azure OpenAI connection at startup
def test_azure_openai_connection() -> bool:
    try:
        if not os.getenv("AZURE_OPENAI_API_KEY") or not os.getenv("AZURE_OPENAI_ENDPOINT"):
            logger.error("Azure OpenAI credentials not found in environment variables")
            return False
            
        # Try a simple completion to test the connection
        test_model = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            temperature=0.2,
        )
        
        test_response = test_model.invoke([HumanMessage(content="Hello")])
        logger.info(f"Azure OpenAI connection test successful: {test_response.content}")
        return True
    except Exception as e:
        logger.error(f"Azure OpenAI connection test failed: {e}")
        return False

# Call the test function
azure_openai_available = test_azure_openai_connection()

# Add a dictionary to store conversation memory by session ID
conversation_memories = {}

# Function to get or create conversation memory
def get_conversation_memory(session_id: str = None):
    if not session_id or session_id not in conversation_memories:
        # Create new session ID if none provided or invalid
        new_session_id = session_id or str(uuid.uuid4())
        conversation_memories[new_session_id] = ConversationBufferMemory()
        return new_session_id, conversation_memories[new_session_id]
    return session_id, conversation_memories[session_id]

# Helper function to format devices and plans for prompt
def format_devices_for_prompt():
    devices_text = "Available Devices:\n"
    for _, device in devices_df.iterrows():
        features = device["features"].split(";") if isinstance(device["features"], str) else []
        devices_text += f"- {device['name']} (id:{device['id']}, brand:{device['brand']}): €{device['price']} - {', '.join(features)}\n"
    return devices_text

def format_plans_for_prompt():
    plans_text = "Available Plans:\n"
    for _, plan in plans_df.iterrows():
        features = plan["features"].split(";") if isinstance(plan["features"], str) else []
        plans_text += f"- {plan['name']} (id:{plan['id']}, type:{plan['type']}): €{plan['price']} - {plan['data']} - {', '.join(features)}\n"
    return plans_text

# Updated chat endpoint with session management
@app.post("/api/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message", "")
        session_id = data.get("session_id", None)
        reset_conversation = data.get("reset", False)
        
        logger.info(f"Received chat request with message: '{user_message}', session_id: {session_id}, reset: {reset_conversation}")
        
        # Reset conversation if requested
        if reset_conversation and session_id in conversation_memories:
            del conversation_memories[session_id]
            logger.info(f"Reset conversation for session {session_id}")
            return {"response": "Conversation has been reset.", "session_id": session_id, "reset": True}
        
        # Get or create conversation memory
        session_id, memory = get_conversation_memory(session_id)
        
        # If Azure OpenAI is not available, return a mock response
        if not azure_openai_available or chat_model is None:
            logger.warning("Azure OpenAI unavailable, returning mock response")
            mock_result = {
                "response": "I found these options based on your request.",
                "devices": [
                    {"id": "1", "name": "iPhone 15 Pro", "reasoning": "High-end device with excellent camera and performance."},
                    {"id": "2", "name": "Galaxy S24", "reasoning": "Great Android option with AI features and good value."}
                ],
                "plans": [
                    {"id": "101", "name": "MagentaMobil S", "reasoning": "Good balance of data and price."}
                ],
                "session_id": session_id
            }
            return mock_result
            
        # Dynamically generate device and plan information
        devices_context = format_devices_for_prompt()
        plans_context = format_plans_for_prompt()
        
        # Get conversation history
        history = memory.load_memory_variables({})
        history_text = history.get("history", "")
        
        # Create system prompt for the LLM with dynamic data
        system_message = SystemMessage(content=f"""You are a mobile phone shopping assistant for customers. Help them find the best phone and plan based on their needs.

{devices_context}
{plans_context}

CONVERSATION HISTORY:
{history_text}

INSTRUCTIONS:
1. If the user needs to provide more details for a good recommendation, ask specific clarifying questions.
2. Only recommend products from the available list.
3. Always include device ID and plan ID in your recommendations.
4. If the user's query is vague, don't guess - ask for clarification.

Respond with your recommendation in this JSON format:
{{
  "devices": [
    {{
      "id": "device_id",
      "name": "device_name",
      "reasoning": "why you recommend this device"
    }}
  ],
  "plans": [
    {{
      "id": "plan_id",
      "name": "plan_name",
      "reasoning": "why you recommend this plan"
    }}
  ],
  "response": "Your conversational response to the user",
  "needs_clarification": true/false
}}

If you need more information, set needs_clarification to true and ask specific questions.
""")

        user_msg = HumanMessage(content=user_message)
        
        # Log the request being sent to Azure OpenAI
        logger.info("Sending request to Azure OpenAI")
        
        # Send to Azure OpenAI
        response = chat_model.invoke([system_message, user_msg])
        
        # Update conversation memory
        memory.save_context({"input": user_message}, {"output": response.content})
        
        # Log the raw response
        logger.info(f"Raw LLM response: {response.content}")
        
        # Parse the response to extract JSON
        try:
            # Try to extract JSON with regex
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```|({[\s\S]*})', response.content)
            if json_match:
                json_str = json_match.group(1) or json_match.group(2)
                result = json.loads(json_str)
                logger.info(f"Successfully parsed JSON response: {json.dumps(result, indent=2)}")
            else:
                # Return text response if no JSON found
                logger.warning("No JSON found in response, using raw text")
                result = {
                    "response": response.content,
                    "needs_clarification": True
                }
        except Exception as parse_error:
            logger.error(f"Error parsing JSON: {str(parse_error)}")
            # Return raw response if JSON parsing fails
            result = {
                "response": response.content,
                "needs_clarification": True
            }
        
        # Add session_id to response
        result["session_id"] = session_id
        
        return result
        
    except Exception as e:
        logger.exception(f"Error in chat endpoint: {e}")
        return {
            "response": "I encountered an error processing your request. Please try again.",
            "error": str(e)
        }

# Add a clear conversation endpoint
@app.post("/api/clear-conversation")
async def clear_conversation(request: Request):
    try:
        data = await request.json()
        session_id = data.get("session_id", None)
        
        if session_id and session_id in conversation_memories:
            del conversation_memories[session_id]
            return {"success": True, "message": "Conversation cleared"}
        
        return {"success": False, "message": "Invalid session ID"}
    except Exception as e:
        logger.exception(f"Error clearing conversation: {e}")
        return {"success": False, "message": str(e)}

@app.post("/api/embedding")
async def embedding(request: Request):
    try:
        data = await request.json()
        text = data.get("text", "")
        if not text:
            return {"error": "Please provide text to embed"}
            
        embedding = embedding_model.embed_documents([text])
        return {"embedding": embedding[0]}
    except Exception as e:
        print(f"Error in embedding endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice")
async def voice(request: Request):
    try:
        # Check if chat model is initialized
        if chat_model is None:
            return {"response": "AI services are not available right now. Please try again later."}
            
        data = await request.json()
        transcript = data.get("transcript", "")
        if not transcript:
            return {"response": "Please provide a transcript"}
            
        response = chat_model.invoke([HumanMessage(content=transcript)])
        return {"response": response.content}
    except Exception as e:
        print(f"Error in voice endpoint: {e}")
        return {"response": f"Sorry, I encountered an error. Please try again later."}

@app.get("/api/bundles")
def get_bundles():
    if devices_df.empty or plans_df.empty:
        return []
        
    bundles = []
    for _, device in devices_df.iterrows():
        for _, plan in plans_df.iterrows():
            bundles.append({
                "device": device["name"],
                "plan": plan["name"],
                "price": float(device["price"]) + float(plan["price"]),
                "device_image": device["image"]
            })
    return bundles

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)