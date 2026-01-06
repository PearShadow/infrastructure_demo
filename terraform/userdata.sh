#!/bin/bash
set -e

# Update system packages
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install git
yum install -y git

# Clone the application repository
cd /home/ec2-user
git clone https://github.com/hhrnjic1/infrastructure_demo.git app
cd app

# Set environment variables
export DB_PASSWORD="${db_password}"

# Build and start the application
docker-compose up -d --build

# Add ec2-user to docker group
usermod -aG docker ec2-user
