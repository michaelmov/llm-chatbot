# --- Backend Task Definition ---

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT", value = "3001" },
        { name = "NODE_ENV", value = "production" },
        { name = "LLM_PROVIDER", value = "anthropic" },
        { name = "MODEL_NAME", value = var.model_name },
        { name = "MODEL_TEMPERATURE", value = var.model_temperature },
        { name = "MODEL_MAX_TOKENS", value = var.model_max_tokens },
        { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}" },
        { name = "BACKEND_URL", value = "http://${aws_lb.main.dns_name}" },
        { name = "FRONTEND_URL", value = "http://${aws_lb.main.dns_name}" },
        { name = "COOKIE_SECURE", value = "false" },
        { name = "DATABASE_SSL", value = "true" },
      ]

      secrets = [
        {
          name      = "ANTHROPIC_API_KEY"
          valueFrom = aws_ssm_parameter.anthropic_api_key.arn
        },
        {
          name      = "WEATHER_API_KEY"
          valueFrom = aws_ssm_parameter.weather_api_key.arn
        },
        {
          name      = "BETTER_AUTH_SECRET"
          valueFrom = aws_ssm_parameter.better_auth_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-backend"
  }
}

# --- Backend Service ---

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3001
  }

  service_registries {
    registry_arn = aws_service_discovery_service.backend.arn
  }

  depends_on = [aws_lb_listener.http]

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "${var.project_name}-backend"
  }
}
