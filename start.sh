#!/bin/bash
# filepath: /Users/shankhabagchi/Documents/ShoppingGPT-main/start.sh

echo "Starting ShoppingGPT backend and frontend..."

# Start backend
cd backend
echo "Starting backend server..."
python -m uvicorn main:app --reload &
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