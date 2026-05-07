# This tells Terraform to look up your current AWS account info
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}
data "aws_partition" "current" {}

# This resource runs the validation script locally
resource "terraform_data" "validate_dataset" {
  triggers_replace = [
    # Re-run if the data files or the validator script itself changes
    filesha1("../testdata/training_data.jsonl"),
    filesha1("../tools/BedrockJsonValidator/nova_ft_dataset_validator.py")
  ]

  provisioner "local-exec" {
    # Working directory is set to where the script lives
    working_dir = "../tools/BedrockJsonValidator"

    command = "sh validate_data.sh"
  }
}

# Step to upload jsonl files to S3
resource "aws_s3_object" "training_data" {
  bucket = aws_s3_bucket.fhir-data-group8-atl-2026.id
  key    = "training-data/training_data.jsonl" # The path/name inside the S3 bucket
  source = "../testdata/training_data.jsonl"   # The local path to your file

  # This ensures the file re-uploads if the content changes
  source_hash = filemd5("../testdata/training_data.jsonl")

  # Set the content type so Bedrock reads it correctly
  content_type = "application/jsonlines"

  # Don't upload if validation failed
  depends_on = [terraform_data.validate_dataset]
}

# Generates example FHIR data for the app
resource "terraform_data" "generate_synthea_data" {
  # Trigger this whenever the count or the seed changes
  triggers_replace = [
    var.synthea_seed,
    var.synthea_pop_count
  ]

  provisioner "local-exec" {
    working_dir = "../tools/Synthea"

    interpreter = ["sh", "-c"]

    command = <<-EOT
      # Recombine the split files into the whole jar
      cat synthea-with-dependencies.jar.part* > synthea-with-dependencies.jar
      # -s: seed, -p: population size
      java -jar synthea-with-dependencies.jar -s ${var.synthea_seed} -p ${var.synthea_pop_count}

      # Sync the output FHIR JSONs to S3
      aws s3 sync ./output/fhir s3://${aws_s3_bucket.fhir-data-group8-atl-2026.id}/patients/ --delete
    EOT
  }
}