#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "Installing validator dependencies..."
pip install -r requirements.txt --quiet

echo "Starting validation on training data..."
python nova_ft_dataset_validator.py -i ../../testdata/training_data.jsonl -m lite 

echo "Validation finished successfully!"