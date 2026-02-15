# --- RDS Subnet Group ---

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# --- RDS PostgreSQL Instance ---

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-postgres"

  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = var.my_ip != null
  multi_az            = false

  skip_final_snapshot      = true
  backup_retention_period  = 0
  delete_automated_backups = true
  apply_immediately        = true

  tags = {
    Name = "${var.project_name}-postgres"
  }
}
