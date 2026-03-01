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
  description = "Base domain for tunnel URLs (e.g. ducky.wtf). Used for HTTPS UI and assigned tunnel URLs."
  type        = string
}

variable "tunnel_subdomain" {
  description = "Subdomain for WebSocket tunnel endpoint (e.g. tunnel -> wss://tunnel.ducky.wtf). Leave empty to use tunnel_domain with port 4000 (no TLS on WS)."
  type        = string
  default     = "tunnel"
}

variable "use_database_auth" {
  description = "Use RDS Postgres for auth (keys granted via UI). When true, valid_tokens is ignored and DATABASE_* is used."
  type        = bool
  default     = true
}

variable "valid_tokens" {
  description = "Comma-separated list of valid tokens (legacy mode when use_database_auth = false). Stored in Secrets Manager. Required when use_database_auth = false."
  type        = string
  default     = ""
  sensitive   = true
}

# Database (required when use_database_auth = true)
variable "database_instance_class" {
  description = "RDS instance class when use_database_auth is true"
  type        = string
  default     = "db.t3.micro"
}

variable "database_allocated_storage" {
  description = "RDS allocated storage (GB)"
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Postgres database name"
  type        = string
  default     = "ducky"
}

variable "database_username" {
  description = "Postgres master username (required when use_database_auth = true)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "database_password" {
  description = "Postgres master password (required when use_database_auth = true)"
  type        = string
  default     = ""
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

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "max_tunnels_per_token" {
  description = "Max tunnels per auth token"
  type        = number
  default     = 5
}

variable "request_timeout_ms" {
  description = "Request timeout in ms"
  type        = number
  default     = 30000
}
