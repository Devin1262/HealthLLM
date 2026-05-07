terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.39.0"
    }
  }

  required_version = ">= 1.14"

  backend "s3" {
    bucket  = "group8-terraform-state-storage" # Create this bucket manually once
    key     = "state/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    # Use a DynamoDB table for "locking" so two people can't apply at once
    dynamodb_table = "terraform-state-locking"
  }
}

provider "aws" {
  region = "us-east-1"
}