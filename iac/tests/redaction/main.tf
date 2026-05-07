data "external" "python_test" {
  program = ["sh", "-c", <<-EOT
    python test_redaction.py
  EOT
  ]
}

output "status" {
  value = data.external.python_test.result.status
}