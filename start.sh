#!/bin/bash
# filepath: /Users/shankhabagchi/Documents/ShoppingGPT-main/start.sh

echo "Starting ShoppingGPT backend and frontend..."

# Start backend
cd backend
echo "Starting backend server..."

# Find the right Python command (could be python, python3, or python3.x)
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python not found. Please install Python 3."
    exit 1
fi

echo "Using Python command: $PYTHON_CMD"

# Check if virtual environment exists, create if needed
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv .venv
    echo "Installing dependencies..."
    source .venv/bin/activate
    pip install -r requirements.txt
else
    echo "Using existing virtual environment..."
    source .venv/bin/activate
fi

# Run backend using the virtual environment's Python
echo "Starting uvicorn server..."
.venv/bin/python -m uvicorn main:app --reload &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend
cd ../frontend
echo "Starting frontend server..."
npm start &
FRONTEND_PID=$!

# Function to handle script termination
function cleanup {
  echo "Stopping servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit
}

# Register the cleanup function for SIGINT and SIGTERM signals
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "Both servers are running. Press Ctrl+C to stop."
wait