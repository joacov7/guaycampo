output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster API server"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_certificate_authority" {
  description = "Base64-encoded certificate authority data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "Port for the RDS PostgreSQL instance"
  value       = module.rds.db_port
}

output "redis_endpoint" {
  description = "Connection endpoint for the ElastiCache Redis cluster"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Port for the ElastiCache Redis cluster"
  value       = module.elasticache.redis_port
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}
