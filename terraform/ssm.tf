# --- SSM Parameter Store for Secrets ---

resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/${var.project_name}/anthropic-api-key"
  type  = "SecureString"
  value = var.anthropic_api_key

  tags = {
    Name = "${var.project_name}-anthropic-api-key"
  }
}

resource "aws_ssm_parameter" "weather_api_key" {
  name  = "/${var.project_name}/weather-api-key"
  type  = "SecureString"
  value = var.weather_api_key

  tags = {
    Name = "${var.project_name}-weather-api-key"
  }
}

resource "aws_ssm_parameter" "better_auth_secret" {
  name  = "/${var.project_name}/better-auth-secret"
  type  = "SecureString"
  value = var.better_auth_secret

  tags = {
    Name = "${var.project_name}-better-auth-secret"
  }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/db-password"
  type  = "SecureString"
  value = var.db_password

  tags = {
    Name = "${var.project_name}-db-password"
  }
}
