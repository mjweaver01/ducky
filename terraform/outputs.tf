output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "https_endpoint" {
  description = "HTTPS endpoint URL"
  value       = "https://${var.tunnel_domain}"
}

output "tunnel_endpoint" {
  description = "WebSocket tunnel endpoint for CLI (wss, no port when using NLB)"
  value       = var.tunnel_subdomain != "" ? "wss://${var.tunnel_subdomain}.${var.tunnel_domain}" : "wss://${var.tunnel_domain}:4000"
}

output "tunnel_nlb_dns_name" {
  description = "NLB DNS name for WebSocket (create CNAME tunnel_subdomain.tunnel_domain to this)"
  value       = var.tunnel_subdomain != "" ? aws_lb.tunnel[0].dns_name : null
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "certificate_validation_records" {
  description = "DNS records needed for certificate validation"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  }
}

output "dns_records_needed" {
  description = "DNS records you need to create"
  value       = "See certificate_validation_records for ACM. ALB: ${var.tunnel_domain} and *.${var.tunnel_domain} → ${aws_lb.main.dns_name}${var.tunnel_subdomain != "" ? ". NLB (wss): ${var.tunnel_subdomain}.${var.tunnel_domain} → " : ""}${var.tunnel_subdomain != "" ? aws_lb.tunnel[0].dns_name : ""}"
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "rds_endpoint" {
  description = "RDS instance endpoint (for migrations when use_database_auth = true)"
  value       = var.use_database_auth ? aws_db_instance.main[0].endpoint : null
}
