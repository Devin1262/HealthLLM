# build_lambda.sh
rm -rf ../../iac/package
mkdir ../../iac/package
pip install -r requirements.txt --target ../../iac/package
# Copy your handler INTO the package folder so it gets zipped
cp redact_PII.py ../../iac/package/
cp api_handler.py ../../iac/package/