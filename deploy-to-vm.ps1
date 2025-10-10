# KardexCare Deployment Script for Google Cloud VM (PowerShell)
Write-Host "🚀 KardexCare VM Deployment Helper" -ForegroundColor Green

# You need to replace VM_IP with your actual VM external IP
$VM_IP = "YOUR_VM_EXTERNAL_IP_HERE"
$VM_USER = "kishorereddypullur123"

Write-Host "📋 Deployment Instructions:" -ForegroundColor Yellow
Write-Host "1. Get your VM's external IP from Google Cloud Console"
Write-Host "2. Replace YOUR_VM_EXTERNAL_IP_HERE in this script with actual IP"
Write-Host "3. Run the commands below to connect and deploy"
Write-Host ""

Write-Host "🔧 Connection Commands:" -ForegroundColor Cyan
Write-Host "# Connect to your VM:"
Write-Host "ssh $VM_USER@$VM_IP" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Deployment Commands (run on VM):" -ForegroundColor Cyan
Write-Host @"
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install git -y

# Setup PostgreSQL database
sudo -u postgres psql -c "CREATE DATABASE kardexcare;"
sudo -u postgres psql -c "CREATE USER kardexcare_user WITH ENCRYPTED PASSWORD 'KardexCare2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kardexcare TO kardexcare_user;"

# Clone your repository
git clone https://github.com/Pullurukishore/Kardexremstar.git
cd Kardexremstar

# Setup backend
cd backend
npm install

# Create backend .env file
cat > .env << 'EOL'
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://kardexcare_user:KardexCare2024!@localhost:5432/kardexcare"
JWT_SECRET="your-super-secure-jwt-secret-key-for-production-min-32-chars"
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
CLOUDINARY_CLOUD_NAME="dyug52gwr"
CLOUDINARY_API_KEY="129297333364842"
CLOUDINARY_API_SECRET="bBx7GxAeSbc1R5Nnbfr75qieo18"
LOCATIONIQ_KEY="your-locationiq-api-key"
EOL

# Setup database
npx prisma generate
npx prisma db push

# Build backend
npm run build

# Setup frontend
cd ../frontend
npm install

# Create frontend .env.local (replace VM_IP with your actual IP)
VM_IP=`$(curl -s ifconfig.me)`
cat > .env.local << EOL
NEXT_PUBLIC_API_URL="http://`${VM_IP}:5000"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="dyug52gwr"
EOL

# Build frontend
npm run build

# Create PM2 config
cd ..
cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [
    {
      name: 'kardexcare-backend',
      cwd: './backend',
      script: 'dist/app.js',
      env: { NODE_ENV: 'production', PORT: 5000 }
    },
    {
      name: 'kardexcare-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
EOL

# Configure firewall
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw --force enable

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Show status
pm2 status
echo "✅ Deployment completed!"
echo "🌐 Frontend: http://`$(curl -s ifconfig.me):3000"
echo "🔌 Backend: http://`$(curl -s ifconfig.me):5000"
"@ -ForegroundColor White

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy the commands above"
Write-Host "2. SSH into your VM: ssh $VM_USER@$VM_IP"
Write-Host "3. Paste and run the commands"
Write-Host "4. Your app will be available at http://$VM_IP:3000"
