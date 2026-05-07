#!/bin/bash

# Replace with your actual AWS SSO profile name
PROFILE="AdministratorAccess-374149329723"
REGION="us-east-1"

echo "Checking AWS SSO session for profile: $PROFILE..."

# Try to get the caller identity. If it fails, we need to login.
if ! aws sts get-caller-identity --profile $PROFILE > /dev/null 2>&1; then
    echo "Session expired or not found. Initiating SSO login..."
    aws sso login --profile $PROFILE
else
    echo "Vault is already open! Session is still valid."
fi

echo "Set this environment variable if you not using Default Profile: AWS_PROFILE=$AWS_PROFILE"
echo "aws sts get-caller-identity Needs to work without args"
aws sts get-caller-identity --profile $PROFILE --query "Arn" --output text