import json
import os

def redact_fhir_bundle(input_data):
    """
    Scans a FHIR Bundle and redacts common PII fields, including explicit
    checks for SSNs and phone numbers within nested arrays.
    """
    if isinstance(input_data, dict):
        # Broad PII fields to redact if found at the top level of a resource
        pii_fields = [
            'name', 'telecom', 'address', 'photo', 'contact', 'birthDate'
        ]
        
        # If this is a Patient, Practitioner, or Person, redact common fields
        resource_type = input_data.get('resourceType')
        if resource_type in ['Patient', 'Practitioner', 'RelatedPerson', 'Person']:
            for field in pii_fields:
                if field in input_data:
                    input_data[field] = "REDACTED"

        # Specific Logic for Identifiers (SSN, Driver's License, etc.)
        if 'identifier' in input_data and isinstance(input_data['identifier'], list):
            for ident in input_data['identifier']:
                # Look for SSN system URLs or types to be specific, or just redact all identifiers
                # Most Synthea/Standard FHIR uses: http://hl7.org/fhir/sid/us-ssn
                input_data['identifier'] = "REDACTED"
                break # Once redacted, we can move on

        # Specific Logic for Telecom (Phone/Email) if not already caught
        if 'telecom' in input_data:
             input_data['telecom'] = "REDACTED"

        # Recurse through the rest of the object
        for key, value in input_data.items():
            redact_fhir_bundle(value)
            
    elif isinstance(input_data, list):
        for item in input_data:
            redact_fhir_bundle(item)

# For testing
def process_file(file_path, output_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        bundle = json.load(f)
    
    redact_fhir_bundle(bundle)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(bundle, f, indent=2)

# For testing
if __name__ == "__main__":
    input_folder = "../../tools/Synthea/output/fhir"
    output_folder = "../../tools/Synthea/output/fhir_redacted"
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(input_folder):
        if filename.endswith(".json"):
            print(f"Redacting {filename}...")
            process_file(
                os.path.join(input_folder, filename),
                os.path.join(output_folder, filename)
            )