# Deployment Guide

This guide covers deploying the Azure VM Dashboard to your Claude VM.

## Prerequisites

1. SSH access to your Claude VM (Account A)
2. Azure Service Principal with access to both subscriptions
3. Claude API key (from Anthropic)
4. Gemini API key (from Google AI Studio)

## Step 1: Set Up Azure Service Principal

### Create Service Principal (if not already created)

```bash
# Login to Azure CLI
az login

# Create service principal with Contributor role on Account A
az ad sp create-for-rbac \
  --name "vm-dashboard-sp" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_A_ID>

# Save the output:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "vm-dashboard-sp",
#   "password": "your-client-secret",
#   "tenant": "your-tenant-id"
# }
```

### Grant Access to Account B

```bash
# Login to Account B
az login --tenant <TENANT_B_ID>

# Grant the service principal access to Account B's subscription
az role assignment create \
  --assignee <APP_ID_FROM_ABOVE> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_B_ID>
```

## Step 2: Prepare the VM

SSH into your Claude VM:

```bash
ssh user@<CLAUDE_VM_IP>
```

### Install Node.js 18+

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should be v18.x or higher
npm --version
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

## Step 3: Deploy the Application

### Copy Application Files

From your local machine:

```bash
# Create archive (excluding node_modules)
cd azure-vm-dashboard
tar --exclude='node_modules' --exclude='.next' -czf dashboard.tar.gz .

# Copy to VM
scp dashboard.tar.gz user@<CLAUDE_VM_IP>:~/
```

On the VM:

```bash
# Create app directory
mkdir -p ~/azure-vm-dashboard
cd ~/azure-vm-dashboard

# Extract files
tar -xzf ~/dashboard.tar.gz

# Install dependencies
npm install

# Build the application
npm run build
```

### Configure Environment Variables

```bash
# Create .env.local file
cat > .env.local << 'EOF'
# Azure Service Principal
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Subscription IDs
AZURE_SUBSCRIPTION_A=subscription-id-account-a
AZURE_SUBSCRIPTION_B=subscription-id-account-b

# VM A (Claude VM) - Account A
VM_A_NAME=your-claude-vm-name
VM_A_RESOURCE_GROUP=your-resource-group-a

# VM B (Gemini VM) - Account B
VM_B_NAME=your-gemini-vm-name
VM_B_RESOURCE_GROUP=your-resource-group-b

# AI API Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Dashboard Authentication
DASHBOARD_PASSWORD=your-secure-password

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-session-secret
EOF

# Secure the file
chmod 600 .env.local
```

### Start with PM2

```bash
# Start the application
pm2 start npm --name "vm-dashboard" -- start

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup
```

## Step 4: Configure Nginx as Reverse Proxy

### Create Nginx Configuration

```bash
sudo tee /etc/nginx/sites-available/vm-dashboard << 'EOF'
server {
    listen 80;
    server_name _;  # Or your domain name

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/vm-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Enable HTTPS with Let's Encrypt (Optional but Recommended)

If you have a domain name pointed to your VM:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

## Step 5: Configure Azure NSG (Network Security Group)

Allow HTTP/HTTPS traffic to your VM:

```bash
# Allow HTTP (port 80)
az network nsg rule create \
  --resource-group <RESOURCE_GROUP> \
  --nsg-name <NSG_NAME> \
  --name AllowHTTP \
  --priority 100 \
  --destination-port-ranges 80 \
  --access Allow \
  --protocol Tcp

# Allow HTTPS (port 443)
az network nsg rule create \
  --resource-group <RESOURCE_GROUP> \
  --nsg-name <NSG_NAME> \
  --name AllowHTTPS \
  --priority 101 \
  --destination-port-ranges 443 \
  --access Allow \
  --protocol Tcp
```

## Step 6: Verify Deployment

1. Open your browser and navigate to `http://<CLAUDE_VM_IP>` or `https://yourdomain.com`
2. Enter the dashboard password you configured
3. Verify:
   - Both VMs show up with correct status
   - Start/Stop buttons work
   - AI Inference tab can send messages
   - Command runner executes commands on VMs

## Useful Commands

```bash
# View application logs
pm2 logs vm-dashboard

# Restart application
pm2 restart vm-dashboard

# Stop application
pm2 stop vm-dashboard

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update application
cd ~/azure-vm-dashboard
git pull  # or re-copy files
npm install
npm run build
pm2 restart vm-dashboard
```

## Troubleshooting

### Application won't start
- Check logs: `pm2 logs vm-dashboard`
- Verify .env.local exists and has correct values
- Ensure Node.js version is 18+

### Can't connect to Azure VMs
- Verify service principal credentials
- Check subscription IDs are correct
- Ensure SP has Contributor role on both subscriptions

### Nginx returns 502 Bad Gateway
- Ensure application is running: `pm2 status`
- Check if app is listening on port 3000: `curl localhost:3000`

### SSL certificate issues
- Ensure DNS is pointed to VM's public IP
- Run `sudo certbot renew --dry-run` to test renewal
