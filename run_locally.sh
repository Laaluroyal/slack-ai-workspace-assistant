#!/bin/bash
# Navigate to the workspace directory
cd /Users/saiteja/.gemini/antigravity/scratch/slack-ai-workspace-assistant

# Open the project in VS Code
if command -v code &> /dev/null; then
    code .
else
    echo "VS Code CLI ('code') not found. Please open /Users/saiteja/.gemini/antigravity/scratch/slack-ai-workspace-assistant in VS Code manually."
fi

# Start the dev server
npm run dev
