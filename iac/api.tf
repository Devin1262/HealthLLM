# API Gateway
resource "aws_api_gateway_rest_api" "api" {
  name = "myapi"
}

resource "aws_api_gateway_resource" "proxy" {
  path_part   = "{proxy+}"
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_method" "method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  
  # Links Cognito Authorizer here
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# OPTIONS method for CORS preflight (no authorization required)
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Mock integration for OPTIONS
resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS method response
resource "aws_api_gateway_method_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
  
  response_models = {
    "application/json" = "Empty"
  }
}

# OPTIONS integration response
resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  
  depends_on = [aws_api_gateway_integration.options]
}

resource "aws_api_gateway_integration" "integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.lambda.invoke_arn

  timeout_milliseconds = 29000
}

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  # AI told me to change this to below:
  #triggers = {
  #  redeployment = sha1(jsonencode(aws_api_gateway_rest_api.api.body))
  #}

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.method.id,
      aws_api_gateway_method.options.id,
      aws_api_gateway_integration.integration.id,
      aws_api_gateway_integration.options.id,
      aws_api_gateway_method_response.options.id,
      aws_api_gateway_integration_response.options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "dev"
}

# Lambda
resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:${data.aws_partition.current.partition}:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.api.id}/*"
}

# Trigger the build script
resource "terraform_data" "lambda_build" {
  triggers_replace = [
    # Re-run if the handler or requirements change
    filesha1("../src/lambda/api_handler.py"),
    filesha1("../src/lambda/redact_PII.py"),
    filesha1("../src/lambda/requirements.txt")
  ]

  provisioner "local-exec" {
    # Working directory is set to where the script lives
    working_dir = "../src/lambda"

    command = "sh build_lambda.sh"
  }
}

# This replaces the .sh script for the zipping part
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "./package" # Zip the package folder
  output_path = "${path.module}/lambda.zip"

  # Ensure the package folder is built before zipping
  depends_on = [terraform_data.lambda_build]
}

# Update the Lambda to "wait" for the build to finish
resource "aws_lambda_function" "lambda" {
  filename = data.archive_file.lambda_zip.output_path

  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # Now looking at the copy the script just placed in your current folder
  function_name = "mylambda"
  role          = aws_iam_role.role.arn
  handler       = "api_handler.lambda_handler"
  runtime       = "python3.12"
  timeout = 30

  environment {
    variables = {
      MODEL_ARN = local.deployment_model_arn
    }
  }
}

# IAM
data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "role" {
  name               = "myrole"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "lambda_healthlake_access" {
  name = "LambdaHealthLakeAccessPolicy"
  role = aws_iam_role.role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "healthlake:SearchWithGet",
          "healthlake:ReadResource",
          "healthlake:CreateResource",
          "healthlake:UpdateResource",
          "healthlake:DeleteResource",
          "healthlake:SearchResources",
          "healthlake:DescribeFHIRDatastore",
          "healthlake:ListFHIRDatastores"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Allows lambda to call bedrock LLM
resource "aws_iam_role_policy" "lambda_bedrock_access" {
  name = "LambdaBedrockInvokePolicy"
  role = aws_iam_role.role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "bedrock:InvokeModel"
        Effect   = "Allow"
        Resource = local.deployment_model_arn
      }
    ]
  })
}

# Add  logging for debugging LLM timeouts
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# cognito
resource "aws_cognito_user_pool" "user_pool" {
  name = "user-pool"
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }
  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "client" {
  name                                 = "web-client"
  user_pool_id                         = aws_cognito_user_pool.user_pool.id
  explicit_auth_flows                  = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["profile", "email", "openid"]
  allowed_oauth_flows_user_pool_client = true
  callback_urls                        = ["https://dac87k3pehax.cloudfront.net/login"]
  logout_urls                          = ["https://dac87k3pehax.cloudfront.net/login"]
  generate_secret                      = false
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "medical-diagnosis-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
}

resource "aws_cognito_user" "test_user_admin" {
  user_pool_id   = aws_cognito_user_pool.user_pool.id
  username       = "admin"
  password       = "password"
  attributes     = { email = "admin@example.com", email_verified = true } #
  message_action = "SUPPRESS"
}

resource "aws_cognito_user" "test_user_standard" {
  user_pool_id   = aws_cognito_user_pool.user_pool.id
  username       = "user"
  password       = "password"
  attributes     = { email = "user@example.com", email_verified = true }
  message_action = "SUPPRESS"
}

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "llm-diagnosis-cognito-authorizer"
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.user_pool.arn]
  identity_source = "method.request.header.Authorization"
  rest_api_id     = aws_api_gateway_rest_api.api.id
}

# Outputs for Amplify configuration
output "cognito_domain" {
  value       = aws_cognito_user_pool_domain.main.domain
  description = "Cognito domain name (prefix only) for Amplify config"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.user_pool.id
  description = "Cognito User Pool ID for Amplify"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.client.id
  description = "Cognito Client ID for Amplify"
}
