# Automates fine-tuning job creation
resource "aws_bedrock_custom_model" "disease_guess_model" {
  # Logic: If skip is true, count is 0. If skip is false, count is 1.
  count = var.skip_fine_tuning ? 0 : 1

  custom_model_name     = "disease-guess-${formatdate("YYYYMMDD-HHmm", timestamp())}"
  job_name              = "disease-guess-job-${formatdate("YYYYMMDD-HHmm", timestamp())}"
  base_model_identifier = "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0:256k"
  role_arn              = aws_iam_role.bedrock_fine_tuning_role.arn

  # Hyperparameters for Nova (adjust based on your dataset size)
  hyperparameters = {
    "epochCount"              = "2"
    "batchSize"               = "1"
    "learningRate"            = "0.00001"
    "learningRateWarmupSteps" = "0"
  }

  lifecycle {
    # If Terraform tries to delete this, the command will CRASH 
    # and fail instead of actually deleting the model.
    prevent_destroy = true
  }

  training_data_config {
    s3_uri = "s3://${aws_s3_bucket.fhir-data-group8-atl-2026.id}/${aws_s3_object.training_data.key}"
  }

  output_data_config {
    s3_uri = "s3://${aws_s3_bucket.fhir-data-group8-atl-2026.id}/model-output/"
  }

  # Ensure the data is actually in S3 before starting the job
  depends_on = [
    aws_s3_object.training_data
  ]
}

# Creates the "On-Demand Deployment" unit from custom LLM
#Note: doesn't seem to be a way to make a "On-Demand Deployment" with Terraform
/*
resource "aws_bedrock_provisioned_model_throughput" "nova_throughput" {
  model_arn              = local.target_model_arn
  provisioned_model_name = "disease-guess-on-demand"

  model_units            = 1

  # This forces Terraform to wait for the 90-minute script to finish if training
  depends_on = [terraform_data.wait_for_model]
}
*/

resource "terraform_data" "wait_for_model" {
  # Logic: Only run the waiter if we are actually training
  count = var.skip_fine_tuning ? 0 : 1

  triggers_replace = [
    aws_bedrock_custom_model.disease_guess_model[0].id
  ]

  provisioner "local-exec" {
    # Call the script and pass the Job ID as the first argument
    command = "sh ./wait_for_model.sh ${aws_bedrock_custom_model.disease_guess_model[0].id}"
  }
}