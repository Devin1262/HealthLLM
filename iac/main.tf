# source https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api
# https://advancedweb.hu/how-to-use-api-gateway-with-cloudfront/

data "aws_canonical_user_id" "current" {}

resource "aws_s3_bucket" "app_bucket" {
  bucket = "cs-6440-88-llm-diagnosis-front-end"
}

resource "aws_s3_bucket_public_access_block" "app_bucket_public_access_block" {
  bucket                  = aws_s3_bucket.app_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "no-override"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "s3_bucket_policy" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.app_bucket.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.app_distribution.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "app_bucket_policy" {
  bucket = aws_s3_bucket.app_bucket.id
  policy = data.aws_iam_policy_document.s3_bucket_policy.json
}

# Cloudfront
resource "aws_cloudfront_distribution" "app_distribution" {
  origin {
    domain_name              = aws_s3_bucket.app_bucket.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # maybe re-enable later, it makes it harder to debug
  #custom_error_response {
  #  error_code         = 404
  #  response_code      = 200
  #  response_page_path = "/index.html"
  #}

  origin {
    domain_name = replace(aws_api_gateway_stage.api.invoke_url, "/^https?://([^/]*).*/", "$1")
    origin_id   = "apigw"
    origin_path = "/dev"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "apigw"

    default_ttl = 0
    min_ttl     = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      headers      = ["Authorization"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }
}

# Bedrock LLM
# KMS Key for Medical Data Encryption
resource "aws_kms_key" "bedrock_key" {
  description             = "KMS key for encrypting FHIR training data"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# Main S3 Bucket
resource "aws_s3_bucket" "fhir-data-group8-atl-2026" {
  bucket = "fhir-disease-guessing-project-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "fhir_enc" {
  bucket = aws_s3_bucket.fhir-data-group8-atl-2026.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.bedrock_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Cleanup of old data
resource "aws_s3_bucket_lifecycle_configuration" "data_lifecycle" {
  bucket = aws_s3_bucket.fhir-data-group8-atl-2026.id

  rule {
    id     = "cleanup-old-logs"
    status = "Enabled"

    filter {
      prefix = "invocation-logs/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "archive-model-output"
    status = "Enabled"

    filter {
      prefix = "model-output/"
    }

    transition {
      days          = 7
      storage_class = "GLACIER" # Move old model weights to deep freeze
    }
  }
}

# IAM Role for Bedrock
resource "aws_iam_role" "bedrock_fine_tuning_role" {
  name = "BedrockFineTuningServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "bedrock.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}

# Permissions for the Role (Access to S3 and KMS)
resource "aws_iam_role_policy" "bedrock_s3_access" {
  name = "BedrockS3Access"
  role = aws_iam_role.bedrock_fine_tuning_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.fhir-data-group8-atl-2026.arn}",
          "${aws_s3_bucket.fhir-data-group8-atl-2026.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.bedrock_key.arn]
      }
    ]
  })
}

# Output
output "s3_bucket_id" {
  value       = aws_s3_bucket.fhir-data-group8-atl-2026.id
  description = "Main bucket for training data and patient data."
}

output "lambda_function_name" {
  value = aws_lambda_function.lambda.function_name
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.app_distribution.domain_name
}

output "api_url" {
  value = aws_api_gateway_stage.api.invoke_url
}

# The IAM Role Bedrock needs to read the S3 data
output "bedrock_fine_tuning_role_arn" {
  value       = aws_iam_role.bedrock_fine_tuning_role.arn
  description = "Use this ARN in the Bedrock console for the 'Service Access' role."
}

output "nova_model_arn" {
  value       = local.target_model_arn
  description = "The ARN of the custom Nova model."
}

output "nova_model_endpoint_arn" {
  value       = local.deployment_model_arn
  description = "The ARN of the deployed on-demand model."
}

output "training_data_s3_uri" {
  value       = "s3://${aws_s3_bucket.fhir-data-group8-atl-2026.id}/${aws_s3_object.training_data.key}"
  description = "S3 URI string that the Bedrock console will ask for."
}