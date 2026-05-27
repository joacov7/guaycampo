terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  backend "s3" {
    bucket         = "guaycampo-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "guaycampo-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "guaycampo"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# VPC
# ---------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "guaycampo-${var.environment}"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                                       = 1
    "kubernetes.io/cluster/guaycampo-${var.environment}"           = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                              = 1
    "kubernetes.io/cluster/guaycampo-${var.environment}"           = "shared"
  }
}

# ---------------------------------------------------------------------------
# EKS
# ---------------------------------------------------------------------------
module "eks" {
  source = "./modules/eks"

  cluster_name    = "guaycampo-${var.environment}"
  cluster_version = "1.31"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = {
    general = {
      instance_types = var.environment == "production" ? ["t3.large"] : ["t3.medium"]
      min_size       = var.environment == "production" ? 3 : 1
      max_size       = var.environment == "production" ? 20 : 5
      desired_size   = var.environment == "production" ? 3 : 2
      disk_size      = 50
    }
  }
}

# ---------------------------------------------------------------------------
# RDS (PostgreSQL)
# ---------------------------------------------------------------------------
module "rds" {
  source = "./modules/rds"

  identifier        = "guaycampo-${var.environment}"
  engine_version    = "17.2"
  instance_class    = var.environment == "production" ? "db.r7g.large" : "db.t3.medium"
  multi_az          = var.environment == "production"
  storage_encrypted = true
  db_name           = "guaycampo"
  db_username       = "guaycampo_admin"
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnets
  allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
}

# ---------------------------------------------------------------------------
# ElastiCache (Redis)
# ---------------------------------------------------------------------------
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id      = "guaycampo-${var.environment}"
  node_type       = var.environment == "production" ? "cache.r7g.large" : "cache.t3.micro"
  num_cache_nodes = var.environment == "production" ? 2 : 1
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  allowed_cidr_blocks = module.vpc.private_subnets_cidr_blocks
}
