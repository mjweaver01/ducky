output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "http_endpoint" {
  description = "HTTP endpoint URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "tunnel_endpoint" {
  description = "WebSocket tunnel endpoint"
  value       = "ws://${aws_lb.main.dns_name}:4000"
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}
