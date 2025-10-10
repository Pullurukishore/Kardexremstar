#!/bin/bash

# KardexCare Deployment Script for Google Cloud VM
echo "🚀 Starting KardexCare deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "🗄️ Installing PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Git
echo "📦 Installing Git..."
sudo apt install git -y

# Create PostgreSQL database
echo "🗄️ Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE kardexcare;"
sudo -u postgres psql -c "CREATE USER kardexcare_user WITH ENCRYPTED PASSWORD 'KardexCare2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kardexcare TO kardexcare_user;"

# Clone repository
echo "📥 Cloning repository..."
if [ -d "Kardexremstar" ]; then
    cd Kardexremstar
    git pull origin main
else
    git clone https://github.com/Pullurukishore/Kardexremstar.git
    cd Kardexremstar
fi

# Setup backend
echo "🔧 Setting up backend..."
cd backend
npm install

# Create production environment file
cat > .env << EOL
# Production Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DATABASE_URL="postgresql://kardexcare_user:KardexCare2024!@localhost:5432/kardexcare"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-for-production-min-32-chars"
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Cloudinary Configuration (replace with your actual values)
CLOUDINARY_CLOUD_NAME="dyug52gwr"
CLOUDINARY_API_KEY="129297333364842"
CLOUDINARY_API_SECRET="your-actual-cloudinary-secret"

# LocationIQ Configuration (replace with your actual key)
LOCATIONIQ_KEY="your-locationiq-api-key"

# Twilio Configuration (optional)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
EOL

# Generate Prisma client and push schema
echo "🗄️ Setting up database schema..."
npx prisma generate
npx prisma db push

# Build backend
echo "🔨 Building backend..."
npm run build

# Setup frontend
echo "🔧 Setting up frontend..."
cd ../frontend
npm install

# Get VM external IP
VM_IP=$(curl -s ifconfig.me)

# Create frontend environment file
cat > .env.local << EOL
# Frontend Environment Configuration
NEXT_PUBLIC_API_URL="http://${VM_IP}:5000"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="dyug52gwr"
EOL

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cd ..
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [
    {
      name: 'kardexcare-backend',
      cwd: './backend',
      script: 'dist/app.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'kardexcare-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
EOL

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw --force enable

# Start applications with PM2
echo "🚀 Starting applications..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Frontend: http://${VM_IP}:3000"
echo "🔌 Backend API: http://${VM_IP}:5000"
echo "📊 PM2 Status: pm2 status"
echo "📝 PM2 Logs: pm2 logs"
