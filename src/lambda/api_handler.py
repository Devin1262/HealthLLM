from datetime import datetime
import json
import boto3
import requests
import os
from typing import Any, Dict, Optional, Union
from urllib.parse import urlencode
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from aws_lambda_powertools.event_handler import APIGatewayRestResolver, CORSConfig
from aws_lambda_powertools.event_handler.exceptions import NotFoundError, BadRequestError, InternalServerError
from aws_lambda_powertools.event_handler.api_gateway import Response
from redact_PII import redact_fhir_bundle

# Configure CORS
cors_config = CORSConfig(
    allow_origin="*",
    allow_headers=["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key", "X-Amz-Security-Token"],
    max_age=300,
    allow_credentials=False
)

app = APIGatewayRestResolver(cors=cors_config)
healthlake_client: Any = boto3.client('healthlake')
_session = boto3.Session()
_credentials = _session.get_credentials()
_region = _session.region_name or 'us-east-1'
_default_model_arn = 'arn:aws:bedrock:us-east-1:374149329723:custom-model-deployment/kt1jfq9bmrik'

# Create a strong system persona to bypass "diplomatic" refusals
_llm_instructions = (
    "You are a Clinical Decision Support AI. Your role is to analyze FHIR medical data "
    "and provide technical summaries for healthcare professionals. "
    "The data provided has been de-identified. "
    "Do not provide general health advice to consumers; provide clinical insights based ONLY on the data."
)

_endpoint_cache: Dict[str, str] = {}
_datastore_id_cache: Dict[str, str] = {}

bedrock_runtime: Any = boto3.client(service_name='bedrock-runtime', region_name=_region)

@app.exception_handler(NotFoundError)
def handle_not_found_error(ex: NotFoundError) -> Response:
    metadata = {"path": app.current_event.path, "query_strings": app.current_event.query_string_parameters}
    
    return Response(
        status_code = 404,
        content_type ="application/json",
        body = json.dumps({
            "error": "Resource Not Found",
            "details": str(ex),
            "context": metadata
        })
    )

@app.exception_handler(Exception)
def handle_generic_exception(ex: Exception) -> Response:
    print(f"Unhandled exception: {str(ex)}")
    
    # Return a 500 status with the actual error message
    return Response(
        status_code=500,
        content_type="application/json",
        body=json.dumps({
            "error": "Internal Server Error",
            "details": str(ex)
        })
    )

def get_datastore_id_by_name(target_name: str) -> Optional[str]:
    if target_name in _datastore_id_cache:
        return _datastore_id_cache[target_name]

    client = boto3.client('healthlake')
    next_token: Optional[str] = None

    while True:
        params: Dict[str, Any] = {'Filter': {'DatastoreName': target_name}}
        if next_token:
            params['NextToken'] = next_token

        response: Dict[str, Any] = client.list_fhir_datastores(**params)

        for ds in response.get('DatastorePropertiesList', []):
            if ds['DatastoreName'] == target_name and ds['DatastoreStatus'] == 'ACTIVE':
                _datastore_id_cache[target_name] = ds['DatastoreId']
                return _datastore_id_cache[target_name]

        next_token = response.get('NextToken')
        if not next_token:
            break

    return None


def get_datastore_endpoint(datastore_id: str) -> str:
    if datastore_id not in _endpoint_cache:
        response: Dict[str, Any] = healthlake_client.describe_fhir_datastore(DatastoreId=datastore_id)
        _endpoint_cache[datastore_id] = response['DatastoreProperties']['DatastoreEndpoint']
    return _endpoint_cache[datastore_id]


def signed_request(
        method: str, 
        url: str, 
        json_body: Optional[Dict[str, Any]] = None, 
        query_params: Optional[Dict[str, Any]] = None
    ) -> requests.Response:
    body: Optional[bytes] = json.dumps(json_body).encode('utf-8') if json_body else None
    headers = {'Content-Type': 'application/fhir+json'} if json_body else {}

    # Build the full URL with query parameters for signing
    full_url = url
    if query_params:
        query_string = urlencode(query_params)
        full_url = f"{url}?{query_string}"

    aws_request = AWSRequest(method=method.upper(), url=full_url, data=body, headers=headers)
    SigV4Auth(_credentials.get_frozen_credentials(), 'healthlake', _region).add_auth(aws_request)

    return requests.request(
        method=method.upper(),
        url=full_url,
        data=body,
        headers=dict(aws_request.headers),
    )


# invoke via cloudfrontdistributionurl/api/example
@app.get("/api/example")
def get_users()-> Dict[str, str]:
    return {"text": "Hello World3!"}
    
@app.post("/api/example/redact")
def test_redaction() -> Response:
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Data in the body is required for the call")
	
    redact_fhir_bundle(body)
    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "redacted_payload": body
        }, indent=2)
    )

@app.get("/api/patient-id/<username>")
def get_patient_id(username: str):
    patient_id = _USER_PATIENT_MAP.get(username)
    if not patient_id:
        raise NotFoundError("Patient not found")
    return {"patientId": patient_id}

@app.get("/api/patient/<patient_id>")
def get_patient(patient_id: str) -> Response:
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")
    endpoint = get_datastore_endpoint(ds_id)
    response = signed_request('GET', f"{endpoint}/Patient/{patient_id}")
    if response.status_code == 404:
        raise NotFoundError(f"Patient/{patient_id} not found")
    
    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.post("/api/fhir/<datastore_id>/<resource_type>")
def create_resource(datastore_id: str, resource_type: str)-> Response:
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    endpoint = get_datastore_endpoint(datastore_id)
    url = f"{endpoint}/{resource_type}"

    response = signed_request('POST', url, json_body=body)

    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.get("/api/fhir/<datastore_id>/<resource_type>/<resource_id>")
def read_resource(datastore_id: str, resource_type: str, resource_id: str) -> Response:
    endpoint = get_datastore_endpoint(datastore_id)
    url = f"{endpoint}/{resource_type}/{resource_id}"

    response = signed_request('GET', url)

    if response.status_code == 404:
        raise NotFoundError(f"{resource_type}/{resource_id} not found")
    if response.status_code != 200:
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.get("/api/fhir/<datastore_id>/<resource_type>")
def search_resources(datastore_id: str, resource_type: str) -> Response:
    endpoint = get_datastore_endpoint(datastore_id)
    url = f"{endpoint}/{resource_type}"

    query_params = app.current_event.query_string_parameters or {}

    response = signed_request('GET', url, query_params=query_params or None)

    if response.status_code != 200:
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.put("/api/fhir/<datastore_id>/<resource_type>/<resource_id>")
def update_resource(datastore_id: str, resource_type: str, resource_id: str) -> Response:
    body = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    endpoint = get_datastore_endpoint(datastore_id)
    url = f"{endpoint}/{resource_type}/{resource_id}"

    response = signed_request('PUT', url, json_body=body)

    if response.status_code == 404:
        raise NotFoundError(f"{resource_type}/{resource_id} not found")
    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.delete("/api/fhir/<datastore_id>/<resource_type>/<resource_id>")
def delete_resource(datastore_id: str, resource_type: str, resource_id: str) -> Response:
    endpoint = get_datastore_endpoint(datastore_id)
    url = f"{endpoint}/{resource_type}/{resource_id}"

    response = signed_request('DELETE', url)

    if response.status_code == 404:
        raise NotFoundError(f"{resource_type}/{resource_id} not found")
    if response.status_code not in (200, 204):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps({
            "message": f"{resource_type}/{resource_id} deleted successfully"
        })
    )


# Pass the specific instruction to the core logic
@app.post("/api/llm/summarize")
def summarize_clinical_data() -> Response:
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Data in the body is required for the LLM call")

    return _query_llm(body, "Summarize the following redacted FHIR data into a concise executive summary for a physician:")


# Pass a generic instruction from the body
@app.post("/api/llm/query")
def handle_query() -> Response:
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Data in the body is required for the LLM call")

    # Get instruction from Query Params
    # Example URL: /api/llm/query?instruction=Why%20do%20I%20have%20a%20headache
    query_params = app.current_event.query_string_parameters or {}
    instruction_query = query_params.get("instruction")

    instruction = instruction_query or "Analyze the following healthcare data:"
    
    return _query_llm(body, instruction)


def _query_llm(clinical_data: dict, instruction: str) -> Response:
    # Redact the incoming clinical data BEFORE sending to LLM
    redact_fhir_bundle(clinical_data)

    full_prompt = f"{_llm_instructions}\n\nTask: {instruction}\n\nData: {json.dumps(clinical_data)}"

    # Use the environment variable passed from Terraform
    model_id = os.environ.get("MODEL_ARN", _default_model_arn)

    payload: Dict[str, Any] = {
        "inferenceConfig": {
            "max_new_tokens": 1000
        },
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": full_prompt
                    }
                ]
            }
        ]
    }

    try:
        response: Dict[str, Any] = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json"
        )
        
        body_stream = response.get("body")

        if body_stream is None:
            raise InternalServerError("Bedrock response returned an empty body")

        response_body: Dict[str, Any] = json.loads(body_stream.read())
        
        # Extract text from Nova's response structure
        response_text: str = response_body['output']['message']['content'][0]['text']

        return Response(
            status_code=200,
            content_type="application/json",
            body=json.dumps({
                "summary": response_text
            })
        )
    except Exception as e:
        print(f"Error calling Bedrock Nova: {str(e)}")
        raise BadRequestError(f"Bedrock error: {str(e)}")


@app.get("/api/patient/<patient_id>/dashboard")
def patient_dashboard(patient_id: str) -> Response:
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)

    # --- Fetch all needed data ---
    response = signed_request('GET', f"{endpoint}/Patient/{patient_id}")

    if response.status_code == 404:
        raise NotFoundError(f"{patient_id} not found")
    if response.status_code != 200:
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    patient = response.json()

    conditions = signed_request(
        'GET', f"{endpoint}/Condition",
        query_params={"subject": f"Patient/{patient_id}"}
    ).json()

    encounters = signed_request(
        'GET', f"{endpoint}/Encounter",
        query_params={"subject": f"Patient/{patient_id}"}
    ).json()

    meds = signed_request(
        'GET', f"{endpoint}/MedicationRequest",
        query_params={"subject": f"Patient/{patient_id}", "status": "active"}
    ).json()

    allergies = signed_request(
        'GET', f"{endpoint}/AllergyIntolerance",
        query_params={"patient": f"Patient/{patient_id}"}
    ).json()

    observations = signed_request(
        'GET', f"{endpoint}/Observation",
        query_params={"subject": f"Patient/{patient_id}", "_count": "100"}
    ).json()

    # --- Patient basics ---
    name_obj = patient.get("name", [{}])[0]
    full_name = " ".join(name_obj.get("given", [])) + " " + name_obj.get("family", "")

    age = calculate_age(patient.get("birthDate"))

    # --- Encounter-based symptoms ---
    latest_encounter = get_latest_encounter(encounters.get("entry", []))

    chief_symptom = None
    other_symptoms = []

    if latest_encounter:
        reason_codes = latest_encounter.get("reasonCode", [])

        codes = [
            rc["coding"][0]
            for rc in reason_codes
            if "coding" in rc
        ]

        if codes:
            chief = codes[0]
            chief_symptom = chief.get("display")

            other_symptoms = [
                c.get("display") for c in codes[1:3]
            ]

    # --- Conditions list ---
    condition_list = [
        c["resource"]["code"]["coding"][0].get("display")
        for c in conditions.get("entry", [])
        if "code" in c["resource"]
    ]

    # --- Medications ---
    medications = [
        m["resource"]["medicationCodeableConcept"]["coding"][0].get("display")
        for m in meds.get("entry", [])
        if "medicationCodeableConcept" in m["resource"]
    ]

    # --- Allergies ---
    allergy_list = [
        a["resource"]["code"]["coding"][0].get("display")
        for a in allergies.get("entry", [])
    ]

    # --- Vitals (LOINC-based) ---
    temp = get_latest_observation(observations, "8310-5")
    bp = get_latest_observation(observations, "85354-9")
    hr = get_latest_observation(observations, "8867-4")
    spo2 = get_latest_observation(observations, "59408-5")

    temperature = temp.get("valueQuantity", {}).get("value") if temp else None
    heart_rate = hr.get("valueQuantity", {}).get("value") if hr else None
    oxygen = spo2.get("valueQuantity", {}).get("value") if spo2 else None

    blood_pressure = None
    if bp and "component" in bp:
        systolic = next(
            (c for c in bp["component"] if c["code"]["coding"][0]["code"] == "8480-6"),
            None
        )
        diastolic = next(
            (c for c in bp["component"] if c["code"]["coding"][0]["code"] == "8462-4"),
            None
        )

        if systolic and diastolic:
            blood_pressure = f"{systolic['valueQuantity']['value']}/{diastolic['valueQuantity']['value']}"

    # --- Last consultation ---
    last_consult = latest_encounter.get("period", {}).get("start") if latest_encounter else None

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "id": patient_id,
            "name": full_name.strip(),
            "age": age,
            "gender": patient.get("gender"),

            "last_consultation": last_consult,
            "chief_symptom": chief_symptom,
            "other_symptoms": other_symptoms,

            "medications": medications,
            "allergies": allergy_list,
            "conditions": condition_list,

            "vitals": {
                "temperature": temperature,
                "blood_pressure": blood_pressure,
                "heart_rate": heart_rate,
                "blood_oxygen": oxygen
            }
        })
    )


@app.get("/api/patient/<patient_id>/conditions")
def get_patient_conditions(patient_id: str) -> Response:
    """Get full condition resources for a patient (with IDs for updating)"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)

    # Fetch all conditions for the patient with max allowed count
    conditions_response = signed_request(
        'GET', f"{endpoint}/Condition",
        query_params={"subject": f"Patient/{patient_id}", "_count": "100"}
    )

    if conditions_response.status_code != 200:
        raise BadRequestError(f"HealthLake error {conditions_response.status_code}: {conditions_response.text}")

    conditions_data = conditions_response.json()
    
    # Extract condition resources with their IDs
    conditions_list = []
    for entry in conditions_data.get("entry", []):
        resource = entry.get("resource", {})
        condition_id = resource.get("id")
        condition_code = resource.get("code", {}).get("coding", [{}])[0].get("display", "Unknown")
        
        conditions_list.append({
            "id": condition_id,
            "display": condition_code,
            "resource": resource
        })

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "patient_id": patient_id,
            "datastore_id": ds_id,
            "conditions": conditions_list,
            "count": len(conditions_list)
        })
    )


@app.post("/api/patient/<patient_id>/conditions")
def create_condition_for_patient(patient_id: str) -> Response:
    """Create a new condition for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    # Ensure the condition is linked to the correct patient
    if "subject" not in body:
        body["subject"] = {"reference": f"Patient/{patient_id}"}

    response = signed_request('POST', f"{endpoint}/Condition", json_body=body)

    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.delete("/api/patient/<patient_id>/conditions/<condition_id>")
def delete_condition_for_patient(patient_id: str, condition_id: str) -> Response:
    """Delete a condition for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    response = signed_request('DELETE', f"{endpoint}/Condition/{condition_id}")

    if response.status_code == 404:
        raise NotFoundError(f"Condition/{condition_id} not found")
    if response.status_code not in (200, 204):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "message": f"Condition {condition_id} deleted successfully"
        })
    )


@app.get("/api/patient/<patient_id>/allergies")
def get_patient_allergies(patient_id: str) -> Response:
    """Get full allergy resources for a patient (with IDs for updating)"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)

    # Fetch all allergies for the patient with max allowed count
    allergies_response = signed_request(
        'GET', f"{endpoint}/AllergyIntolerance",
        query_params={"patient": f"Patient/{patient_id}", "_count": "100"}
    )

    if allergies_response.status_code != 200:
        raise BadRequestError(f"HealthLake error {allergies_response.status_code}: {allergies_response.text}")

    allergies_data = allergies_response.json()
    
    # Extract allergy resources with their IDs
    allergies_list = []
    for entry in allergies_data.get("entry", []):
        resource = entry.get("resource", {})
        allergy_id = resource.get("id")
        allergy_code = resource.get("code", {}).get("coding", [{}])[0].get("display", "Unknown")
        
        allergies_list.append({
            "id": allergy_id,
            "display": allergy_code,
            "resource": resource
        })

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "patient_id": patient_id,
            "datastore_id": ds_id,
            "allergies": allergies_list,
            "count": len(allergies_list)
        })
    )


@app.post("/api/patient/<patient_id>/allergies")
def create_allergy_for_patient(patient_id: str) -> Response:
    """Create a new allergy for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    # Ensure the allergy is linked to the correct patient
    if "patient" not in body:
        body["patient"] = {"reference": f"Patient/{patient_id}"}

    response = signed_request('POST', f"{endpoint}/AllergyIntolerance", json_body=body)

    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.delete("/api/patient/<patient_id>/allergies/<allergy_id>")
def delete_allergy_for_patient(patient_id: str, allergy_id: str) -> Response:
    """Delete an allergy for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    response = signed_request('DELETE', f"{endpoint}/AllergyIntolerance/{allergy_id}")

    if response.status_code == 404:
        raise NotFoundError(f"AllergyIntolerance/{allergy_id} not found")
    if response.status_code not in (200, 204):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "message": f"Allergy {allergy_id} deleted successfully"
        })
    )


@app.get("/api/patient/<patient_id>/medications")
def get_patient_medications(patient_id: str) -> Response:
    """Get full medication resources for a patient (with IDs for updating)"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)

    # Fetch all medications for the patient with max allowed count
    medications_response = signed_request(
        'GET', f"{endpoint}/MedicationRequest",
        query_params={"subject": f"Patient/{patient_id}", "status": "active", "_count": "100"}
    )

    if medications_response.status_code != 200:
        raise BadRequestError(f"HealthLake error {medications_response.status_code}: {medications_response.text}")

    medications_data = medications_response.json()
    
    # Extract medication resources with their IDs
    medications_list = []
    for entry in medications_data.get("entry", []):
        resource = entry.get("resource", {})
        medication_id = resource.get("id")
        medication_code = resource.get("medicationCodeableConcept", {}).get("coding", [{}])[0].get("display", "Unknown")
        
        medications_list.append({
            "id": medication_id,
            "display": medication_code,
            "resource": resource
        })

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "patient_id": patient_id,
            "datastore_id": ds_id,
            "medications": medications_list,
            "count": len(medications_list)
        })
    )


@app.post("/api/patient/<patient_id>/medications")
def create_medication_for_patient(patient_id: str) -> Response:
    """Create a new medication for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    # Ensure the medication is linked to the correct patient
    if "subject" not in body:
        body["subject"] = {"reference": f"Patient/{patient_id}"}

    response = signed_request('POST', f"{endpoint}/MedicationRequest", json_body=body)

    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


@app.delete("/api/patient/<patient_id>/medications/<medication_id>")
def delete_medication_for_patient(patient_id: str, medication_id: str) -> Response:
    """Delete a medication for a patient"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    response = signed_request('DELETE', f"{endpoint}/MedicationRequest/{medication_id}")

    if response.status_code == 404:
        raise NotFoundError(f"MedicationRequest/{medication_id} not found")
    if response.status_code not in (200, 204):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "message": f"Medication {medication_id} deleted successfully"
        })
    )


@app.get("/api/patient/<patient_id>/encounters")
def get_patient_encounters(patient_id: str) -> Response:
    """Get encounter resources for a patient with symptoms"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)

    # Fetch encounters for the patient
    encounters_response = signed_request(
        'GET', f"{endpoint}/Encounter",
        query_params={"subject": f"Patient/{patient_id}", "_count": "100"}
    )

    if encounters_response.status_code != 200:
        raise BadRequestError(f"HealthLake error {encounters_response.status_code}: {encounters_response.text}")

    encounters_data = encounters_response.json()
    
    # Get the latest encounter
    latest_encounter = get_latest_encounter(encounters_data.get("entry", []))
    
    if not latest_encounter:
        return Response(
            status_code=200,
            content_type="application/json",
            body=json.dumps({
                "patient_id": patient_id,
                "encounter_id": None,
                "symptoms": []
            })
        )
    
    # Extract symptoms from reasonCode
    symptoms = []
    for reason_code in latest_encounter.get("reasonCode", []):
        for coding in reason_code.get("coding", []):
            symptoms.append({
                "display": coding.get("display"),
                "code": coding.get("code"),
                "system": coding.get("system")
            })
    
    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "patient_id": patient_id,
            "encounter_id": latest_encounter.get("id"),
            "encounter": latest_encounter,
            "symptoms": symptoms
        })
    )


@app.put("/api/patient/<patient_id>/encounters/<encounter_id>")
def update_patient_encounter(patient_id: str, encounter_id: str) -> Response:
    """Update an encounter's symptoms"""
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id)
    
    body: Optional[Dict[str, Any]] = app.current_event.json_body
    if not body:
        raise BadRequestError("Request body is required")

    response = signed_request('PUT', f"{endpoint}/Encounter/{encounter_id}", json_body=body)

    if response.status_code == 404:
        raise NotFoundError(f"Encounter/{encounter_id} not found")
    if response.status_code not in (200, 201):
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")

    return Response(
        status_code=response.status_code,
        content_type="application/json",
        body=json.dumps(response.json())
    )


def calculate_age(birthdate: str):
    if not birthdate:
        return None
    dob = datetime.strptime(birthdate, "%Y-%m-%d")
    today = datetime.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def get_latest_encounter(encounters):
    valid = [
        e["resource"]
        for e in encounters
        if e["resource"].get("period", {}).get("start")
    ]
    return sorted(
        valid,
        key=lambda x: x["period"]["start"],
        reverse=True
    )[0] if valid else None


def find_condition_by_code(encounter_code, conditions):
    matches = []

    for c in conditions.get("entry", []):
        resource = c["resource"]
        for coding in resource.get("code", {}).get("coding", []):
            if coding.get("code") == encounter_code:
                matches.append(resource)

    if not matches:
        return None

    return sorted(
        matches,
        key=lambda x: x.get("onsetDateTime", ""),
        reverse=True
    )[0]


def get_latest_observation(observations, loinc_code, patient_id=None):
    matches = []

    for o in observations.get("entry", []):
        res = o["resource"]
        if patient_id:
            subject_ref = res.get("subject", {}).get("reference", "")
            if patient_id not in subject_ref:
                continue
        for coding in res.get("code", {}).get("coding", []):
            if coding.get("code") == loinc_code:
                matches.append(res)

    if not matches:
        return None

    return sorted(
        matches,
        key=lambda x: x.get("effectiveDateTime", ""),
        reverse=True
    )[0]


@app.get("/api/patient/<patient_id>/alerts")
def patient_alerts(patient_id: str) -> Response:
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")

    endpoint = get_datastore_endpoint(ds_id).rstrip('/')

    patient_resp = signed_request('GET', f"{endpoint}/Patient/{patient_id}")
    if patient_resp.status_code == 404:
        raise NotFoundError(f"Patient/{patient_id} not found")
    patient = patient_resp.json()

    name_obj = patient.get("name", [{}])[0]
    full_name = (" ".join(name_obj.get("given", [])) + " " + name_obj.get("family", "")).strip()
    gender = patient.get("gender", "unknown")
    birth_date = patient.get("birthDate", "")
    age = None
    if birth_date:
        from datetime import date
        birth = date.fromisoformat(birth_date)
        today = date.today()
        age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

    def fetch_obs_by_code(code):
        return signed_request(
            'GET', f"{endpoint}/Observation",
            query_params={"code": code, "subject": f"Patient/{patient_id}", "_count": "100"}
        ).json()

    conditions = signed_request(
        'GET', f"{endpoint}/Condition",
        query_params={"patient": patient_id}
    ).json()

    medications_bundle = signed_request(
        'GET', f"{endpoint}/MedicationRequest",
        query_params={"patient": patient_id, "_count": "50"}
    ).json()

    allergies_bundle = signed_request(
        'GET', f"{endpoint}/AllergyIntolerance",
        query_params={"patient": patient_id, "_count": "50"}
    ).json()

    temp_bundle  = fetch_obs_by_code("8310-5")
    hr_bundle    = fetch_obs_by_code("8867-4")
    spo2_bundle  = fetch_obs_by_code("59408-5")
    bp_bundle    = fetch_obs_by_code("85354-9")

    temp_obs = get_latest_observation(temp_bundle,  "8310-5")
    hr_obs   = get_latest_observation(hr_bundle,    "8867-4")
    spo2_obs = get_latest_observation(spo2_bundle,  "59408-5")
    bp_obs   = get_latest_observation(bp_bundle,    "85354-9")

    temperature = temp_obs.get("valueQuantity", {}).get("value") if temp_obs else None
    heart_rate  = hr_obs.get("valueQuantity", {}).get("value")   if hr_obs   else None
    oxygen      = spo2_obs.get("valueQuantity", {}).get("value") if spo2_obs else None

    systolic = diastolic = None
    if bp_obs and "component" in bp_obs:
        sys_c = next((c for c in bp_obs["component"] if c["code"]["coding"][0]["code"] == "8480-6"), None)
        dia_c = next((c for c in bp_obs["component"] if c["code"]["coding"][0]["code"] == "8462-4"), None)
        if sys_c:
            systolic  = sys_c["valueQuantity"]["value"]
        if dia_c:
            diastolic = dia_c["valueQuantity"]["value"]

    fhir_refs = {
        "temperature":    {"resource_type": "Observation", "resource_id": temp_obs.get("id")} if temp_obs else None,
        "heart_rate":     {"resource_type": "Observation", "resource_id": hr_obs.get("id")}   if hr_obs   else None,
        "blood_oxygen":   {"resource_type": "Observation", "resource_id": spo2_obs.get("id")} if spo2_obs else None,
        "blood_pressure": {"resource_type": "Observation", "resource_id": bp_obs.get("id")}   if bp_obs   else None,
    }

    lab_alerts: list = []

    if temperature is not None:
        if temperature >= 40.0:
            lab_alerts.append({"type": "vital", "name": "Temperature", "value": f"{temperature}°C",
                "severity": "high", "message": f"Temperature critically elevated at {temperature}°C — possible hyperpyrexia",
                "normal_range": "36.1–37.2°C", "fhir_ref": fhir_refs["temperature"]})
        elif temperature >= 38.5:
            lab_alerts.append({"type": "vital", "name": "Temperature", "value": f"{temperature}°C",
                "severity": "moderate", "message": f"Temperature elevated (fever) at {temperature}°C",
                "normal_range": "36.1–37.2°C", "fhir_ref": fhir_refs["temperature"]})
        elif temperature < 35.0:
            lab_alerts.append({"type": "vital", "name": "Temperature", "value": f"{temperature}°C",
                "severity": "high", "message": f"Temperature critically low at {temperature}°C — hypothermia",
                "normal_range": "36.1–37.2°C", "fhir_ref": fhir_refs["temperature"]})
        elif temperature < 35.5:
            lab_alerts.append({"type": "vital", "name": "Temperature", "value": f"{temperature}°C",
                "severity": "moderate", "message": f"Temperature below normal at {temperature}°C",
                "normal_range": "36.1–37.2°C", "fhir_ref": fhir_refs["temperature"]})

    if heart_rate is not None:
        if heart_rate > 130:
            lab_alerts.append({"type": "vital", "name": "Heart Rate", "value": f"{heart_rate} bpm",
                "severity": "high", "message": f"Heart rate critically elevated at {heart_rate} bpm — severe tachycardia",
                "normal_range": "60–100 bpm", "fhir_ref": fhir_refs["heart_rate"]})
        elif heart_rate > 100:
            lab_alerts.append({"type": "vital", "name": "Heart Rate", "value": f"{heart_rate} bpm",
                "severity": "moderate", "message": f"Heart rate elevated at {heart_rate} bpm — tachycardia",
                "normal_range": "60–100 bpm", "fhir_ref": fhir_refs["heart_rate"]})
        elif heart_rate < 50:
            lab_alerts.append({"type": "vital", "name": "Heart Rate", "value": f"{heart_rate} bpm",
                "severity": "high", "message": f"Heart rate critically low at {heart_rate} bpm — severe bradycardia",
                "normal_range": "60–100 bpm", "fhir_ref": fhir_refs["heart_rate"]})
        elif heart_rate < 60:
            lab_alerts.append({"type": "vital", "name": "Heart Rate", "value": f"{heart_rate} bpm",
                "severity": "moderate", "message": f"Heart rate low at {heart_rate} bpm — bradycardia",
                "normal_range": "60–100 bpm", "fhir_ref": fhir_refs["heart_rate"]})

    if oxygen is not None:
        if oxygen < 90:
            lab_alerts.append({"type": "vital", "name": "Blood Oxygen (SpO2)", "value": f"{oxygen}%",
                "severity": "high", "message": f"SpO2 critically low at {oxygen}% — immediate intervention required",
                "normal_range": "95–100%", "fhir_ref": fhir_refs["blood_oxygen"]})
        elif oxygen < 94:
            lab_alerts.append({"type": "vital", "name": "Blood Oxygen (SpO2)", "value": f"{oxygen}%",
                "severity": "moderate", "message": f"SpO2 below normal at {oxygen}%",
                "normal_range": "95–100%", "fhir_ref": fhir_refs["blood_oxygen"]})

    if systolic is not None:
        if systolic > 180:
            lab_alerts.append({"type": "vital", "name": "Blood Pressure (Systolic)", "value": f"{systolic} mmHg",
                "severity": "high", "message": f"Systolic BP critically elevated at {systolic} mmHg — hypertensive crisis",
                "normal_range": "90–120 mmHg", "fhir_ref": fhir_refs["blood_pressure"]})
        elif systolic > 160:
            lab_alerts.append({"type": "vital", "name": "Blood Pressure (Systolic)", "value": f"{systolic} mmHg",
                "severity": "moderate", "message": f"Systolic BP significantly elevated at {systolic} mmHg",
                "normal_range": "90–120 mmHg", "fhir_ref": fhir_refs["blood_pressure"]})
        elif systolic < 70:
            lab_alerts.append({"type": "vital", "name": "Blood Pressure (Systolic)", "value": f"{systolic} mmHg",
                "severity": "high", "message": f"Systolic BP critically low at {systolic} mmHg — shock possible",
                "normal_range": "90–120 mmHg", "fhir_ref": fhir_refs["blood_pressure"]})
        elif systolic < 90:
            lab_alerts.append({"type": "vital", "name": "Blood Pressure (Systolic)", "value": f"{systolic} mmHg",
                "severity": "moderate", "message": f"Systolic BP low at {systolic} mmHg — hypotension",
                "normal_range": "90–120 mmHg", "fhir_ref": fhir_refs["blood_pressure"]})

    condition_list = [
        c["resource"]["code"]["coding"][0].get("display")
        for c in conditions.get("entry", [])
        if "code" in c["resource"]
    ]

    medication_list = [
        m["resource"].get("medicationCodeableConcept", {}).get("text") or
        m["resource"].get("medicationCodeableConcept", {}).get("coding", [{}])[0].get("display")
        for m in medications_bundle.get("entry", [])
        if "medicationCodeableConcept" in m["resource"]
    ]

    allergy_list = [
        a["resource"].get("code", {}).get("text") or
        a["resource"].get("code", {}).get("coding", [{}])[0].get("display")
        for a in allergies_bundle.get("entry", [])
        if "code" in a["resource"]
    ]

    clinical_summary = {
        "patient_id": patient_id,
        "age": age,
        "gender": gender,
        "vitals": {
            "temperature_celsius": temperature,
            "heart_rate_bpm": heart_rate,
            "blood_oxygen_pct": oxygen,
            "blood_pressure_systolic_mmhg": systolic,
            "blood_pressure_diastolic_mmhg": diastolic
        },
        "active_conditions": condition_list,
        "medications": [m for m in medication_list if m],
        "allergies": [a for a in allergy_list if a]
    }

    risk_instruction = (
        "You are a clinical decision support system. Analyze the patient vitals and conditions below for high-risk patterns. "
        "Respond ONLY with a valid JSON array — no markdown, no prose outside the array. Use this exact format: "
        '[{"risk": "description", "severity": "high|moderate|low", "recommendation": "action"}]'
    )

    ai_risks: list = []
    try:
        llm_resp = _query_llm(clinical_summary, risk_instruction)
        llm_body = json.loads(llm_resp.body)
        raw = llm_body.get("summary", "").strip()
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(lines[1:] if lines[-1] != "```" else lines[1:-1])
        parsed = json.loads(raw)
        ai_risks = parsed if isinstance(parsed, list) else [{"risk": raw, "severity": "moderate", "recommendation": "Review with physician"}]
    except Exception as e:
        ai_risks = [{"risk": "AI risk assessment temporarily unavailable", "severity": "low",
                     "recommendation": "Manual clinical review recommended"}]

    for risk in ai_risks:
        risk["context"] = clinical_summary

    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps({
            "patient_id": patient_id,
            "patient_name": full_name,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "lab_alerts": lab_alerts,
            "ai_risks": ai_risks,
            "vitals_snapshot": {
                "temperature": temperature,
                "heart_rate": heart_rate,
                "blood_oxygen": oxygen,
                "blood_pressure": f"{systolic}/{diastolic}" if systolic and diastolic else None
            }
        })
    )


_USER_PATIENT_MAP: Dict[str, str] = {
    "admin": "89d9a9b7-9720-4881-a2ab-d7907544b26f",
    "user": "20a70ecf-c423-4318-82c3-40542074d6a8",
	"ryan_hal": "6d811193-2462-4f81-9675-bc1d35698a49",
	"rah": "9ae87a5e-0cd2-4573-b0b6-c37ae5e5e894",
	"priya.shah12": "92e36d1e-66a2-4e77-9f50-155f7edf819c",
	"winny_bar63": "8f904fe4-f9c5-4c3c-9a64-5cae6a1fcbc0",
	"marcus_bennett": "75f964e0-bf08-4408-9ce0-1e56f841065c",
	"aaron.mitchell": "69c7ad6f-46cc-4fe2-8ce7-39288e73b07e",
	"martha184_b": "31070f11-67f9-427b-b378-5f6b43fa6337",
	"erica.b": "73af8266-6764-4bbd-b890-def971160fd4",
}


@app.get("/api/patients")
def list_patients() -> Response:
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")
    endpoint = get_datastore_endpoint(ds_id).rstrip('/')
    bundle = signed_request('GET', f"{endpoint}/Patient",
        query_params={"_count": "50"}).json()
    patients = []
    for entry in bundle.get('entry', []):
        res = entry['resource']
        name_obj = res.get('name', [{}])[0]
        full_name = (" ".join(name_obj.get("given", [])) + " " + name_obj.get("family", "")).strip()
        patients.append({"id": res.get("id"), "name": full_name or "Unknown"})
    patients.sort(key=lambda p: p["name"])
    return Response(status_code=200, content_type="application/json",
        body=json.dumps({"patients": patients}))


@app.get("/api/me/patient")
def get_my_patient() -> Response:
    try:
        claims = app.current_event.request_context.get("authorizer", {}).get("claims", {})
        username = claims.get("cognito:username", "")
    except Exception:
        raise BadRequestError("Unable to determine current user")
    patient_id = _USER_PATIENT_MAP.get(username)
    if not patient_id:
        raise NotFoundError(f"No patient assigned to user: {username}")
    return Response(status_code=200, content_type="application/json",
        body=json.dumps({"patient_id": patient_id, "username": username}))


@app.get("/api/resource/<resource_type>/<resource_id>")
def get_resource_by_ref(resource_type: str, resource_id: str) -> Response:
    ds_id = get_datastore_id_by_name("FHIRDataStore")
    if not ds_id:
        raise NotFoundError("FHIRDataStore not found")
    endpoint = get_datastore_endpoint(ds_id)
    response = signed_request('GET', f"{endpoint}/{resource_type}/{resource_id}")
    if response.status_code == 404:
        raise NotFoundError(f"{resource_type}/{resource_id} not found")
    if response.status_code != 200:
        raise BadRequestError(f"HealthLake error {response.status_code}: {response.text}")
    return Response(
        status_code=200,
        content_type="application/json",
        body=json.dumps(response.json())
    )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    return app.resolve(event, context)

