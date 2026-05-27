module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    for name, config in var.node_groups : name => {
      name           = name
      instance_types = config.instance_types
      min_size       = config.min_size
      max_size       = config.max_size
      desired_size   = config.desired_size
      disk_size      = lookup(config, "disk_size", 50)

      labels = {
        Environment = split("-", var.cluster_name)[length(split("-", var.cluster_name)) - 1]
        NodeGroup   = name
      }

      update_config = {
        max_unavailable_percentage = 25
      }
    }
  }

  # Allow cluster access from node groups
  enable_cluster_creator_admin_permissions = true
}
