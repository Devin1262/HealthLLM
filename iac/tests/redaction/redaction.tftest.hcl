# This test ensures the Python redactor is functioning before deployment
run "verify_redaction_logic" {
  command = apply

  assert {
    condition     = data.external.python_test.result.status == "success"
    error_message = "Redaction logic failed unit tests. Check Python output for details."
  }
}