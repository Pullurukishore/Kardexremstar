# NSSM Windows Service Setup Guide

This guide shows how to set up KardexCare as Windows services using NSSM (Non-Sucking Service Manager).

## Why NSSM?

✅ **Simple**: No extra npm packages or dependencies  
✅ **Reliable**: Native Windows service wrapper  
✅ **Better Logging**: Built-in log rotation (10MB files)  
✅ **Easy Management**: GUI and CLI tools  
✅ **Production-Ready**: Used in enterprise environments  
✅ **Auto-Restart**: Automatically restarts on crashes  

## Quick Installation

### One-Command Setup

**Run PowerShell as Administrator:**

```powershell
cd "c:\KardexCare"
.\install-services-nssm.ps1
```

This script will:
1. Download NSSM automatically (if not present)
2. Build both frontend and backend
3. Install two Windows services
4. Configure logging and auto-restart
5. Start services immediately

## What Gets Installed

### Services Created

1. **KardexTicketManagementBackend**
   - Display Name: "Kardex Ticket Management Backend"
   - Port: 5003
   - Logs: `backend\logs\`
   - Auto-starts on boot
   - Auto-restarts on failure

2. **KardexTicketManagementFrontend**
   - Display Name: "Kardex Ticket Management Frontend"
   - Port: 3000
   - Logs: `frontend\logs\`
   - Auto-starts on boot
   - Auto-restarts on failure

### Log Files

Both services create rotating log files (max 10MB each):
- `service-output.log` - Standard output
- `service-error.log` - Error output

## Managing Services

### PowerShell Commands

```powershell
# View status
Get-Service KardexTicketManagement*

# Stop services
Stop-Service KardexTicketManagementBackend
Stop-Service KardexTicketManagementFrontend

# Start services
Start-Service KardexTicketManagementBackend
Start-Service KardexTicketManagementFrontend

# Restart services
Restart-Service KardexTicketManagementBackend
Restart-Service KardexTicketManagementFrontend
```

### Windows Services Manager

```powershell
services.msc
```

Look for "Kardex Ticket Management Backend" and "Kardex Ticket Management Frontend"

### NSSM Commands

```powershell
# View service status
.\nssm.exe status KardexTicketManagementBackend

# Edit service configuration (opens GUI)
.\nssm.exe edit KardexTicketManagementBackend

# Restart service
.\nssm.exe restart KardexTicketManagementBackend

# View service details
.\nssm.exe dump KardexTicketManagementBackend
```

## Uninstalling Services

```powershell
cd "c:\KardexCare"
.\uninstall-services-nssm.ps1
```

## Updating Your Application

When you make code changes:

```powershell
# 1. Stop services
Stop-Service KardexTicketManagementBackend
Stop-Service KardexTicketManagementFrontend

# 2. Rebuild backend
cd "c:\KardexCare\backend"
npm run build

# 3. Rebuild frontend
cd "c:\KardexCare\frontend"
npm run build

# 4. Start services
Start-Service KardexTicketManagementBackend
Start-Service KardexTicketManagementFrontend
```

## Manual NSSM Installation

If the automatic download fails:

1. **Download NSSM:**
   - Visit: https://nssm.cc/download
   - Download `nssm-2.24.zip`

2. **Extract:**
   - Extract `win64\nssm.exe` to `c:\KardexCare\`

3. **Run install script:**
   ```powershell
   .\install-services-nssm.ps1
   ```

## Advanced Configuration

### Edit Service Settings (GUI)

```powershell
.\nssm.exe edit KardexTicketManagementBackend
```

This opens a GUI where you can configure:
- Application path and arguments
- Environment variables
- Log file rotation
- Process priority
- Restart behavior
- Dependencies

### Change Port Numbers

**Backend (default 5003):**
1. Edit `backend\.env` - change `PORT=5003`
2. Restart service: `Restart-Service KardexTicketManagementBackend`

**Frontend (default 3000):**
1. Stop service: `Stop-Service KardexTicketManagementFrontend`
2. Edit service: `.\nssm.exe edit KardexTicketManagementFrontend`
3. Change Arguments to: `node_modules\next\dist\bin\next start -p YOUR_PORT`
4. Start service: `Start-Service KardexTicketManagementFrontend`

### Add Service Dependencies

Make backend wait for PostgreSQL:

```powershell
.\nssm.exe set KardexTicketManagementBackend DependOnService postgresql-x64-14
```

(Replace `postgresql-x64-14` with your actual PostgreSQL service name)

## Troubleshooting

### Services Won't Start

1. **Check logs:**
   ```powershell
   # Backend logs
   Get-Content "c:\KardexCare\backend\logs\service-error.log" -Tail 50
   
   # Frontend logs
   Get-Content "c:\KardexCare\frontend\logs\service-error.log" -Tail 50
   ```

2. **Check Event Viewer:**
   ```powershell
   eventvwr.msc
   ```
   Navigate to: Windows Logs → Application

3. **Verify builds:**
   - Backend: Check if `backend\dist\server.js` exists
   - Frontend: Check if `frontend\.next\` folder exists

4. **Test manually:**
   ```powershell
   # Test backend
   cd "c:\KardexCare\backend"
   node dist\server.js
   
   # Test frontend (in new window)
   cd "c:\KardexCare\frontend"
   npm start
   ```

### Port Already in Use

```powershell
# Find what's using port 5003
netstat -ano | findstr :5003

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```powershell
   Get-Service postgresql*
   ```

2. Check connection string in `backend\.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/kardexcare
   ```

3. Test database connection:
   ```powershell
   cd "c:\KardexCare\backend"
   npx prisma db pull
   ```

### Service Crashes Immediately

1. Check if Node.js path is correct:
   ```powershell
   where.exe node
   ```

2. Verify working directory:
   ```powershell
   .\nssm.exe get KardexCareBackend AppDirectory
   ```

3. Check environment variables:
   ```powershell
   .\nssm.exe get KardexCareBackend AppEnvironmentExtra
   ```

### Reinstall Services

```powershell
# Uninstall
.\uninstall-services-nssm.ps1

# Wait 5 seconds

# Reinstall
.\install-services-nssm.ps1
```

## Log Maintenance

Logs automatically rotate at 10MB. To manually clear:

```powershell
# Clear backend logs
Remove-Item "c:\KardexCare\backend\logs\*.log"

# Clear frontend logs
Remove-Item "c:\KardexCare\frontend\logs\*.log"

# Restart services to create new logs
Restart-Service KardexTicketManagementBackend
Restart-Service KardexTicketManagementFrontend
```

## Security Considerations

1. **Run as specific user** (optional):
   ```powershell
.\nssm.exe set KardexTicketManagementBackend ObjectName DOMAIN\Username Password
   ```

2. **Restrict log file access:**
   ```powershell
   icacls "c:\KardexCare\backend\logs" /inheritance:r /grant:r "Administrators:(OI)(CI)F"
   ```

3. **Environment variables:**
   - Keep `.env` files secure
   - Don't commit secrets to git
   - Use strong JWT secrets in production

## Benefits Summary

| Feature | NSSM | node-windows |
|---------|------|--------------|
| Setup Complexity | ⭐⭐⭐⭐⭐ Simple | ⭐⭐⭐ Moderate |
| Reliability | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good |
| Log Management | ⭐⭐⭐⭐⭐ Built-in rotation | ⭐⭐⭐ Basic |
| GUI Configuration | ⭐⭐⭐⭐⭐ Yes | ⭐ No |
| Dependencies | ⭐⭐⭐⭐⭐ None | ⭐⭐⭐ npm package |
| Enterprise Use | ⭐⭐⭐⭐⭐ Common | ⭐⭐⭐ Less common |

## Access Your Application

Once services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5003/api

## Next Steps

1. ✅ Install services using the script
2. ✅ Verify both services are running
3. ✅ Test the application in browser
4. ✅ Restart your laptop to confirm auto-start
5. ✅ Set up PostgreSQL to auto-start (if not already)

---

**Need Help?** Check the logs first, then Event Viewer, then try manual testing.
