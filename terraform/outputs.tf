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
  description = "WebSocket tunnel endpoint (use wss:// with HTTPS)"
  value       = "wss://${var.tunnel_domain}:4000"
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
  value = <<-EOT
    Create these DNS records in your domain registrar:
    
    1. For the main domain and wildcard:
       Type: A (or CNAME)
       Name: ${var.tunnel_domain}
       Value: ${aws_lb.main.dns_name}
       
       Type: A (or CNAME)
       Name: *.${var.tunnel_domain}
       Value: ${aws_lb.main.dns_name}
    
    2. For ACM certificate validation, create these records:
       ${jsonencode([for dvo in aws_acm_certificate.main.domain_validation_options : {
         name  = dvo.resource_record_name
         type  = dvo.resource_record_type
         value = dvo.resource_record_value
       }])}
  EOT
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}
