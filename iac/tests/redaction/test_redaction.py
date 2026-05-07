import sys
import json
from redact_PII import redact_fhir_bundle

def log(message):
    # Prints to stderr so it shows in the console but doesn't break Terraform JSON.
    print(message, file=sys.stderr)

def test_patient_redaction():
    log("Testing Patient resource redaction...")
    dirty_patient = {
        "resourceType": "Patient",
        "id": "123",
        "name": [{"family": "Smith", "given": ["John"]}],
        "telecom": [{"system": "phone", "value": "555-555-5555"}],
        "address": [{"line": ["123 Main St"]}],
        "birthDate": "1985-06-15",
        "ssn": "999-00-1234",
        "gender": "male" # This should NOT be redacted
    }

    redact_fhir_bundle(dirty_patient)
    
    assert dirty_patient["name"] == "REDACTED"
    assert dirty_patient["telecom"] == "REDACTED"
    assert dirty_patient["address"] == "REDACTED"
    assert dirty_patient["birthDate"] == "1900-01-01"
    
    # Ensure non-PII fields are preserved
    assert dirty_patient["resourceType"] == "Patient"
    assert dirty_patient["gender"] == "male"
    assert dirty_patient["id"] == "123"
    
    log("Patient redaction test passed!")

def test_bundle_redaction():
    log("Testing Bundle recursion redaction...")
    # FHIR Search results usually come in a Bundle
    dirty_bundle = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "name": [{"family": "Doe"}],
                    "birthDate": "1990-01-01"
                }
            }
        ]
    }

    redact_fhir_bundle(dirty_bundle)

    # Check nested resource
    patient = dirty_bundle["entry"][0]["resource"]
    assert patient["name"] == "REDACTED"
    assert patient["birthDate"] == "1900-01-01"
    
    log("Bundle recursion test passed!")

if __name__ == "__main__":
    result = {"status": "failed", "message": ""}
    try:
        test_patient_redaction()
        test_bundle_redaction()
        
        result["status"] = "success"
        result["message"] = "All tests passed successfully."
        
        # Final JSON output for Terraform (stdout)
        print(json.dumps(result))
        sys.exit(0)

    except AssertionError as e:
        log(f"Redaction logic is broken: {str(e)}")
        result["message"] = f"Assertion failed: {str(e)}"
        print(json.dumps(result))
        sys.exit(0) # Exit 0 so Terraform can read the "failed" status in the JSON
    except Exception as e:
        log(f"Unexpected error: {str(e)}")
        result["message"] = str(e)
        print(json.dumps(result))
        sys.exit(0)