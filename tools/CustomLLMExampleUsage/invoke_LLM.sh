#!/bin/bash

# Setup Variables
MODEL_ID=$1
# Default Base64 encoded body (What are the symptoms of appendicitis?)
DEFAULT_BODY='eyJpbmZlcmVuY2VDb25maWciOiB7Im1heF9uZXdfdG9rZW5zIjogMTAwfSwgIm1lc3NhZ2VzIjogW3sicm9sZSI6ICJ1c2VyIiwgImNvbnRlbnQiOiBbeyJ0ZXh0IjogIldoYXQgYXJlIHRoZSBzeW1wdG9tcyBvZiBhcHBlbmRpY2l0aXM/In1dfV19'

# Check for Model ID (Required)
if [ -z "$MODEL_ID" ]; then
    echo "Error: Missing Model ID."
    echo "Usage: sh ./invoke_bedrock.sh <MODEL_ID> [BASE64_BODY]"
    exit 1
fi

# Use the second argument if provided, otherwise use default
BODY_CONTENT=${2:-$DEFAULT_BODY}

OUTPUT_FILE="response_$(date +%s).json"

echo "Invoking: $MODEL_ID"
if [ -z "$2" ]; then
    echo "Using default body contents..."
else
    echo "Using custom base64 body..."
fi

# Execute AWS CLI
aws bedrock-runtime invoke-model \
    --model-id "$MODEL_ID" \
    --body "$BODY_CONTENT" \
    --region us-east-1 \
    "$OUTPUT_FILE"

# Handle Result
if [ $? -eq 0 ]; then
    echo "Success! Output saved to $OUTPUT_FILE"
    echo "--- Response ---"
    cat "$OUTPUT_FILE"
    echo -e "\n----------------"
else
    echo "Error: Model invocation failed."
fi