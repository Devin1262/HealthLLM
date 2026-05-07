#!/bin/bash

JOB_ARN=$1

if [ -z "$JOB_ARN" ]; then
    echo "Error: No Job ARN provided."
    exit 1
fi

echo "Waiting for Bedrock Customization Job: $JOB_ARN"

while true; do
    STATUS=$(aws bedrock get-model-customization-job --job-identifier "$JOB_ARN" --query "status" --output text)
    
    echo "$(date '+%H:%M:%S') - Current Status: $STATUS"
    
    if [ "$STATUS" = "Completed" ]; then
        echo "Model training finished successfully!"
        exit 0
    elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Stopped" ]; then
        echo "Model training $STATUS. Check the console for logs."
        exit 1
    fi
    
    # Heartbeat to let you know it's still alive
    sleep 60
done