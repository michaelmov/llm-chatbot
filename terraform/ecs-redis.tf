# --- Redis Task Definition ---

resource "aws_ecs_task_definition" "redis" {
  family                   = "${var.project_name}-redis"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.redis_cpu
  memory                   = var.redis_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "redis"
      image     = "redis:7-alpine"
      essential = true

      command = [
        "redis-server",
        "--maxmemory", "128mb",
        "--maxmemory-policy", "allkeys-lru"
      ]

      portMappings = [
        {
          containerPort = 6379
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.redis.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "redis"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-redis"
  }
}

# --- Redis Service ---

resource "aws_ecs_service" "redis" {
  name            = "${var.project_name}-redis"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.redis.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.redis.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.redis.arn
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name = "${var.project_name}-redis"
  }
}
