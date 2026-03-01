terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }
}

# -----------------------------------------------------------------------------
# RDS Postgres (when use_database_auth = true)
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  count      = var.use_database_auth ? 1 : 0
  name       = "${var.project_name}-db-subnet"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-db-subnet"
  }
}

resource "aws_security_group" "rds" {
  count       = var.use_database_auth ? 1 : 0
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS Postgres"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_db_instance" "main" {
  count                  = var.use_database_auth ? 1 : 0
  identifier             = "${var.project_name}-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.database_instance_class
  allocated_storage      = var.database_allocated_storage
  db_name                = var.database_name
  username               = var.database_username
  password               = var.database_password
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible   = false
  skip_final_snapshot    = true # set to false for production retention

  tags = {
    Name = "${var.project_name}-rds"
  }
}

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "404"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

resource "aws_acm_certificate" "main" {
  domain_name               = var.tunnel_domain
  subject_alternative_names = ["*.${var.tunnel_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-cert"
  }
}

# -----------------------------------------------------------------------------
# Secrets: tokens (legacy) and/or RDS password (database auth)
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "tokens" {
  count       = var.use_database_auth ? 0 : 1
  name        = "${var.project_name}/valid-tokens"
  description = "Valid authentication tokens for ducky (legacy mode)"

  tags = {
    Name = "${var.project_name}-tokens"
  }
}

resource "aws_secretsmanager_secret_version" "tokens" {
  count     = var.use_database_auth ? 0 : 1
  secret_id = aws_secretsmanager_secret.tokens[0].id
  secret_string = jsonencode({
    tokens = split(",", trimspace(var.valid_tokens))
  })
}

resource "aws_secretsmanager_secret" "rds_password" {
  count       = var.use_database_auth ? 1 : 0
  name        = "${var.project_name}/rds-password"
  description = "RDS master password for ducky"

  tags = {
    Name = "${var.project_name}-rds-password"
  }
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  count     = var.use_database_auth ? 1 : 0
  secret_id = aws_secretsmanager_secret.rds_password[0].id
  secret_string = jsonencode({
    password = var.database_password
  })
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  depends_on = [aws_acm_certificate.main]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# -----------------------------------------------------------------------------
# NLB for WebSocket (wss) - TLS on 443 so CLI can use wss://tunnel.ducky.wtf
# -----------------------------------------------------------------------------
resource "aws_lb_target_group" "tunnel" {
  count       = var.tunnel_subdomain != "" ? 1 : 0
  name        = "${var.project_name}-tunnel-tg"
  port        = 4000
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    protocol            = "TCP"
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-tunnel-tg"
  }
}

resource "aws_lb" "tunnel" {
  count              = var.tunnel_subdomain != "" ? 1 : 0
  name               = "${var.project_name}-tunnel-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-tunnel-nlb"
  }
}

resource "aws_lb_listener" "tunnel_tls" {
  count             = var.tunnel_subdomain != "" ? 1 : 0
  load_balancer_arn = aws_lb.tunnel[0].arn
  port              = "443"
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tunnel[0].arn
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-logs"
  }
}

locals {
  task_env = concat(
    [
      { name = "PORT", value = "3000" },
      { name = "TUNNEL_PORT", value = "4000" },
      { name = "TUNNEL_DOMAIN", value = var.tunnel_domain },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "NODE_ENV", value = "production" },
      { name = "TUNNEL_PROTOCOL", value = "https" },
      { name = "MAX_TUNNELS_PER_TOKEN", value = tostring(var.max_tunnels_per_token) },
      { name = "MAX_CONCURRENT_REQUESTS", value = "100" },
      { name = "RATE_LIMIT_MAX_REQUESTS", value = "1000" },
      { name = "REQUEST_TIMEOUT", value = tostring(var.request_timeout_ms) },
      { name = "LOG_LEVEL", value = "info" }
    ],
    var.use_database_auth ? [
      { name = "DATABASE_HOST", value = aws_db_instance.main[0].address },
      { name = "DATABASE_PORT", value = tostring(aws_db_instance.main[0].port) },
      { name = "DATABASE_NAME", value = aws_db_instance.main[0].db_name },
      { name = "DATABASE_USER", value = aws_db_instance.main[0].username },
      { name = "DATABASE_SSL", value = "true" }
    ] : [
      { name = "AWS_SECRET_NAME", value = aws_secretsmanager_secret.tokens[0].name }
    ]
  )
  task_secrets = var.use_database_auth ? [
    { name = "DATABASE_PASSWORD", valueFrom = "${aws_secretsmanager_secret.rds_password[0].arn}:password::" }
  ] : []
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = var.project_name
      image     = var.docker_image
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        },
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]

      environment = [for e in local.task_env : { name = e.name, value = e.value }]
      secrets      = length(local.task_secrets) > 0 ? [for s in local.task_secrets : { name = s.name, valueFrom = s.valueFrom }] : null

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task"
  }
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.public[*].id
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.project_name
    container_port   = 3000
  }

  dynamic "load_balancer" {
    for_each = var.tunnel_subdomain != "" ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.tunnel[0].arn
      container_name   = var.project_name
      container_port   = 4000
    }
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.project_name}-service"
  }
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow ECS to inject RDS password from Secrets Manager into the task
resource "aws_iam_role_policy" "ecs_execution_rds_secret" {
  count       = var.use_database_auth ? 1 : 0
  name        = "${var.project_name}-ecs-execution-rds-secret"
  role        = aws_iam_role.ecs_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.rds_password[0].arn]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-role"
  }
}

resource "aws_iam_role_policy" "ecs_secrets_policy" {
  count  = var.use_database_auth ? 0 : 1
  name   = "${var.project_name}-ecs-secrets-policy"
  role   = aws_iam_role.ecs_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.tokens[0].arn]
      }
    ]
  })
}
