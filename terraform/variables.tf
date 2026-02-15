variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "chatbot"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_a_cidr" {
  description = "CIDR block for subnet A"
  type        = string
  default     = "10.0.1.0/24"
}

variable "subnet_b_cidr" {
  description = "CIDR block for subnet B"
  type        = string
  default     = "10.0.2.0/24"
}

# --- Local Access ---

variable "my_ip" {
  description = "Your public IP in CIDR notation for local DB access (e.g. 1.2.3.4/32)"
  type        = string
  default     = null
}

# --- Database ---

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "chatbot"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "chatbot"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

# --- Secrets ---

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "weather_api_key" {
  description = "Weather API key"
  type        = string
  sensitive   = true
}

variable "better_auth_secret" {
  description = "Better Auth secret"
  type        = string
  sensitive   = true
}

# --- ECS ---

variable "app_desired_count" {
  description = "Desired count for app ECS services (set to 0 for initial infra deploy, 1 after images are pushed)"
  type        = number
  default     = 0
}

variable "backend_cpu" {
  description = "CPU units for backend task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory in MiB for backend task"
  type        = number
  default     = 512
}

variable "frontend_cpu" {
  description = "CPU units for frontend task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory in MiB for frontend task"
  type        = number
  default     = 512
}

variable "redis_cpu" {
  description = "CPU units for Redis task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "redis_memory" {
  description = "Memory in MiB for Redis task"
  type        = number
  default     = 512
}

# --- Model ---

variable "model_name" {
  description = "LLM model name"
  type        = string
  default     = "claude-3-5-sonnet-latest"
}

variable "model_temperature" {
  description = "LLM model temperature"
  type        = string
  default     = "0.3"
}

variable "model_max_tokens" {
  description = "LLM model max tokens"
  type        = string
  default     = "4096"
}
