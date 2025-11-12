# KardexCare Local Storage Setup

## Recommended Folder Structure

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

## Environment Configuration

Add to your `.env` file:

```env
# Storage Configuration
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

## Security Considerations

1. **File Access Control**: Only authenticated users can upload
2. **File Type Validation**: Strict MIME type checking
3. **Size Limits**: Prevent abuse with file size limits
4. **Path Traversal Protection**: Sanitize file names
5. **Virus Scanning**: Consider adding antivirus scanning

## Backup Strategy

1. **Daily**: Copy new files to backup location
2. **Weekly**: Full backup of entire storage folder
3. **Database**: Include attachment metadata in DB backups
4. **Retention**: Keep 30 days of backups

## External User Access

External users (customers) can upload images through:
- Ticket status updates
- Activity reports
- Profile pictures

All uploads go through the same validation and storage system.
