#!/usr/bin/env bash
set -euo pipefail

echo "Starting Ollama server"

# Start the server in the background and wait until it is ready
ollama serve &
SERVER_PID=$!

for attempt in $(seq 1 30); do
    if ollama list >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Preload the model so the first request is fast
#ollama pull gemma2:2b

# Using now a more lightweight model
ollama pull qwen2.5:1.5b

# Keep the container alive and forward shutdown signals to the server
trap 'kill -TERM "$SERVER_PID"' TERM INT
wait "$SERVER_PID"
