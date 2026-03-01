variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ducky"
}

variable "tunnel_domain" {
  description = "Base domain for tunnel URLs"
  type        = string
}

variable "valid_tokens" {
  description = "Comma-separated list of valid authentication tokens"
  type        = string
  sensitive   = true
}

variable "docker_image" {
  description = "Docker image to deploy (e.g., from ECR)"
  type        = string
}

variable "task_cpu" {
  description = "CPU units for ECS task"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Memory for ECS task in MB"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}
