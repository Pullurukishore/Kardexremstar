# KardexCare Local HTTPS Setup Guide

This guide helps you set up Nginx with HTTPS and Basic Authentication locally for testing KardexCare without buying a domain.

## 🎯 What This Setup Provides

- ✅ **HTTPS on localhost** with self-signed certificates
- ✅ **Basic Authentication** with htpasswd (up to 50+ users)
- ✅ **Rate limiting** to prevent abuse
- ✅ **Security headers** for production-like environment
- ✅ **Automatic HTTP → HTTPS redirect**
- ✅ **Proxy to your KardexCare frontend/backend**

## 🚀 Quick Setup (Automated)

### Option 1: One-Click Setup
```powershell
# Run as Administrator
cd C:\KardexCare\nginx\scripts
.\setup-nginx-local.ps1
```

This script will:
1. Download and install Nginx
2. Generate SSL certificates
3. Create htpasswd file with default users
4. Start Nginx with HTTPS

### Option 2: Manual Step-by-Step

#### Step 1: Generate SSL Certificate
```powershell
# Run as Administrator
cd C:\KardexCare\nginx\scripts
.\generate-ssl-cert.ps1
```

#### Step 2: Create User Authentication
```powershell
# Create default users
.\create-htpasswd.ps1

# Or create users interactively
.\create-htpasswd.ps1 -Interactive
```

#### Step 3: Start Nginx
```powershell
cd C:\KardexCare\nginx
.\nginx.exe
```

## 🔐 Default Users

| Username   | Password           | Role        |
|------------|-------------------|-------------|
| admin      | KardexAdmin2024!  | Full access |
| manager    | KardexMgr2024!    | Management  |
| supervisor | KardexSup2024!    | Supervision |
| viewer     | KardexView2024!   | Read-only   |

## 🌐 Access URLs

- **Main Application**: https://localhost
- **API Endpoints**: https://localhost/api/*
- **Health Check**: https://localhost/health (no auth required)

## 📋 Prerequisites

1. **PowerShell** (run as Administrator)
2. **KardexCare application** running on:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🔧 Configuration Details

### Nginx Configuration
- **Location**: `C:\KardexCare\nginx\nginx.conf`
- **SSL Certificates**: `C:\KardexCare\nginx\certs\`
- **User Database**: `C:\KardexCare\nginx\conf\htpasswd`

### Security Features
- **Rate Limiting**: 10 requests/second for general API, 5 requests/minute for login
- **SSL/TLS**: TLS 1.2+ with strong ciphers
- **Security Headers**: HSTS, X-Frame-Options, XSS Protection
- **Basic Auth**: Required for all endpoints except health check

## 🛠️ Management Commands

### Start/Stop Nginx
```powershell
# Start Nginx
cd C:\KardexCare\nginx
.\nginx.exe

# Stop Nginx
Get-Process nginx | Stop-Process

# Reload configuration (after changes)
.\nginx.exe -s reload

# Test configuration
.\nginx.exe -t
```

### View Logs
```powershell
# Access logs
Get-Content C:\KardexCare\nginx\logs\access.log -Tail 20

# Error logs
Get-Content C:\KardexCare\nginx\logs\error.log -Tail 20

# Follow logs in real-time
Get-Content C:\KardexCare\nginx\logs\access.log -Wait
```

### Add More Users
```powershell
# Add a new user to htpasswd file
htpasswd C:\KardexCare\nginx\conf\htpasswd newuser

# Or recreate the entire file
.\scripts\create-htpasswd.ps1 -Interactive
```

## 🔍 Testing the Setup

1. **Start your KardexCare application**:
   ```bash
   # Terminal 1: Backend
   cd C:\KardexCare\backend
   npm run dev

   # Terminal 2: Frontend  
   cd C:\KardexCare\frontend
   npm run dev
   ```

2. **Start Nginx**:
   ```powershell
   cd C:\KardexCare\nginx
   .\nginx.exe
   ```

3. **Test in browser**:
   - Visit: https://localhost
   - Accept security warning (self-signed certificate)
   - Enter credentials: `admin` / `KardexAdmin2024!`
   - You should see your KardexCare application

## ⚠️ Browser Security Warning

Since we're using self-signed certificates, browsers will show a security warning:

1. **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

This is normal for local development with self-signed certificates.

## 🔄 Migrating to Production

When you're ready to deploy with a real domain:

1. **Buy a domain** (e.g., kardexcare.com)
2. **Get real SSL certificates** (Let's Encrypt, CloudFlare, etc.)
3. **Update nginx.conf**:
   ```nginx
   server_name your-domain.com;
   ssl_certificate /path/to/real/fullchain.pem;
   ssl_certificate_key /path/to/real/privkey.pem;
   ```
4. **Deploy to server** - the rest of the configuration stays the same!

## 🐛 Troubleshooting

### Common Issues

**1. "nginx.exe not found"**
- Run the setup script as Administrator
- Or manually download Nginx from http://nginx.org/download/

**2. "Certificate error"**
- Make sure you ran `generate-ssl-cert.ps1` as Administrator
- Check that certificate files exist in `certs/` folder

**3. "403 Forbidden"**
- Check htpasswd file exists: `C:\KardexCare\nginx\conf\htpasswd`
- Verify user credentials with `.\scripts\create-htpasswd.ps1`

**4. "502 Bad Gateway"**
- Make sure KardexCare frontend (port 3000) and backend (port 5000) are running
- Check nginx error logs: `Get-Content logs\error.log`

**5. "Port already in use"**
- Stop existing nginx: `Get-Process nginx | Stop-Process`
- Or change ports in nginx.conf

### Logs and Debugging
```powershell
# Check if nginx is running
Get-Process nginx

# View configuration test
.\nginx.exe -t

# Check port usage
netstat -an | findstr :443
netstat -an | findstr :80
```

## 💡 Tips

1. **Multiple Domains**: Add `kardex.local` to your hosts file for custom local domain
2. **Development**: Use `.\nginx.exe -s reload` to reload config without stopping
3. **Security**: Change default passwords before sharing with team
4. **Performance**: The configuration includes gzip compression and caching
5. **Monitoring**: Check access logs to see authentication attempts

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review nginx error logs
3. Verify all prerequisites are met
4. Test each component individually (SSL, auth, proxy)

---

🎉 **You now have a production-like HTTPS setup running locally!**

This setup mimics a real production environment with SSL termination, authentication, and reverse proxy - perfect for testing before deploying to a real server.
