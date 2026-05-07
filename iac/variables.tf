variable "base_model_id" {
  type    = string
  default = "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0"
}

variable "skip_fine_tuning" {
  description = "If true, skips the 90-minute training job and uses the below existing model ARN."
  type        = bool
  default     = true
}

variable "active_model_arn" {
  description = "The ARN of the successfully trained model to use if skip_fine_tuning is true."
  type        = string
  default     = "arn:aws:bedrock:us-east-1:374149329723:custom-model/amazon.nova-2-lite-v1:0:256k/pjv6129d37as"
}

variable "synthea_seed" {
  type        = string
  description = "The seed used for deterministic synthetic data generation."
  default     = "1776106873341"
}

variable "synthea_pop_count" {
  type        = number
  description = "The number of patient records to generate."
  default     = 100

  validation {
    condition     = var.synthea_pop_count > 0 && var.synthea_pop_count <= 5000
    error_message = "Population count must be between 1 and 5000"
  }
}

locals {
  # Use the new custom model if training, otherwise use the existing model
  target_model_arn = var.skip_fine_tuning ? var.active_model_arn : one(aws_bedrock_custom_model.disease_guess_model[*].custom_model_arn)

  # Update this if a new custom model deployment is done
  deployment_model_arn = "arn:aws:bedrock:us-east-1:374149329723:custom-model-deployment/kt1jfq9bmrik"
}