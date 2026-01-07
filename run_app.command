#!/bin/bash
# Move to the directory where this script is located
cd "$(dirname "$0")"

echo "------------------------------------------------"
echo "  NotebookLM 連携ツールを起動しています...  "
echo "------------------------------------------------"

# Open the browser immediately (it will retry until the server is ready)
open http://localhost:3001

# Start the development server on port 3001 to avoid conflicts
npm run dev -- -p 3001
