# KardexCare Local Storage Setup

## ⚠️ Important: Images are stored LOCALLY

**Company Policy:** All images must stay within the network. DO NOT use external cloud storage services like Cloudinary.

## Recommended Folder Structure

### Local Development (Windows)
```
C:\KardexCare\storage\
├── images\
│   ├── tickets\           # Ticket verification photos
│   ├── activities\        # Activity verification photos
│   ├── profiles\          # User profile pictures
│   └── reports\           # Report attachments
├── documents\
│   ├── tickets\           # Ticket PDFs, docs
│   ├── reports\           # Generated reports
│   └── templates\         # Report templates
├── backups\
│   ├── daily\             # Daily backups
│   └── weekly\            # Weekly backups
└── temp\                  # Temporary files
```

### AWS Production (EBS Volume)
```
D:\storage\               # Dedicated EBS volume (recommended: 50-100GB gp3)
├── images\
│   ├── tickets\
│   ├── activities\
│   └── profiles\
├── documents\
├── backups\
└── temp\
```

## Environment Configuration

### Local Development (.env)
```env
# Storage Configuration - Local
STORAGE_ROOT=C:\KardexCare\storage
UPLOAD_DIR=C:\KardexCare\storage\images
PHOTO_UPLOAD_DIR=C:\KardexCare\storage\images
DOCUMENT_DIR=C:\KardexCare\storage\documents
BACKUP_DIR=C:\KardexCare\storage\backups
TEMP_DIR=C:\KardexCare\storage\temp

# File Limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_PHOTOS_PER_UPLOAD=10
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
ALLOWED_DOCUMENT_TYPES=pdf,doc,docx

# Cleanup Settings
TEMP_FILE_RETENTION_HOURS=24
BACKUP_RETENTION_DAYS=30
```

### AWS Production (.env)
```env
# Storage Configuration - AWS EBS Volume
STORAGE_ROOT=D:\storage
UPLOAD_DIR=D:\storage\images
PHOTO_UPLOAD_DIR=D:\storage\images
DOCUMENT_DIR=D:\storage\documents
BACKUP_DIR=D:\storage\backups
TEMP_DIR=D:\storage\temp

# File Limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_PHOTOS_PER_UPLOAD=10
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp
ALLOWED_DOCUMENT_TYPES=pdf,doc,docx

# Cleanup Settings
TEMP_FILE_RETENTION_HOURS=24
BACKUP_RETENTION_DAYS=30
```

## AWS Deployment Guide

### Step 1: Create EBS Volume
1. Go to AWS Console → EC2 → Volumes
2. Create Volume:
   - Type: **gp3** (recommended)
   - Size: **50GB** (start, can resize later)
   - Availability Zone: Same as your EC2 instance
3. Attach to your EC2 instance

### Step 2: Mount EBS Volume (Windows)
1. Connect to EC2 via RDP
2. Open Disk Management
3. Initialize the new disk
4. Format as NTFS and assign drive letter **D:**
5. Create folder structure: `D:\storage\images\`, etc.

### Step 3: Enable Automatic Backups
1. Go to AWS Console → EC2 → Lifecycle Manager
2. Create Lifecycle Policy:
   - Target: Your EBS volume
   - Schedule: Daily
   - Retention: 7 snapshots

### Step 4: Update Environment Variables
Set the environment variables in your production `.env` file as shown above.

## Security Considerations

1. **File Access Control**: Only authenticated users can upload
2. **File Type Validation**: Strict MIME type checking
3. **Size Limits**: Prevent abuse with file size limits
4. **Path Traversal Protection**: Sanitize file names
5. **Virus Scanning**: Consider adding antivirus scanning
6. **EBS Encryption**: Enable encryption for the EBS volume

## Backup Strategy

### Local Development
1. **Daily**: Copy new files to backup location
2. **Weekly**: Full backup of entire storage folder

### AWS Production
1. **EBS Snapshots**: Automated daily via Lifecycle Manager
2. **Cross-Region**: Consider copying snapshots to another region
3. **Retention**: Keep 30 days of snapshots
4. **Database**: Include attachment metadata in RDS backups

## External User Access

External users (customers) can upload images through:
- Ticket status updates
- Activity reports
- Profile pictures

All uploads go through the same validation and storage system.

## Troubleshooting

### Images not saving
1. Check PHOTO_UPLOAD_DIR environment variable is set
2. Verify the storage folder exists and has write permissions
3. Check disk space on the storage volume

### Images not displaying
1. Verify the static file serving middleware is configured
2. Check the `/storage/` route is set up in Express
3. Ensure file paths in database match actual file locations

