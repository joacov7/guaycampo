variable "cluster_id" {
  description = "Identifier for the ElastiCache cluster"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 1
}

variable "vpc_id" {
  description = "ID of the VPC where ElastiCache will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ElastiCache subnet group"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to ElastiCache"
  type        = list(string)
  default     = []
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain ElastiCache snapshots"
  type        = number
  default     = 5
}

output "redis_endpoint" {
  description = "Primary endpoint address of the ElastiCache cluster"
  value       = aws_elasticache_cluster.this.cache_nodes[0].address
}

output "redis_port" {
  description = "Port of the ElastiCache cluster"
  value       = aws_elasticache_cluster.this.port
}

output "redis_auth_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth.arn
}
