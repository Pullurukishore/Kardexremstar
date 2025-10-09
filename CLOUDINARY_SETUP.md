# Cloudinary Photo Storage Setup Guide

This guide explains how to configure Cloudinary for permanent photo storage in your KardexCare application.

## Prerequisites

1. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **Cloudinary Credentials**: Get your Cloud Name, API Key, and API Secret from your dashboard

## Environment Configuration

### Backend Configuration (.env)

Add these variables to your `backend/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dyug52gwr
CLOUDINARY_API_KEY=129297333364842
CLOUDINARY_API_SECRET=bBx7GxAeSbc1R5Nnbfr75qieo18
```

### Frontend Configuration (.env.local)

Add this variable to your `frontend/.env.local` file:

```env
# Cloudinary Configuration (for client-side optimizations)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dyug52gwr
```

## Features Implemented

### 1. **Permanent Photo Storage**
- Photos are now stored permanently in Cloudinary cloud storage
- Automatic image optimization and compression
- CDN delivery for fast loading
- Multiple format support (JPEG, PNG, WebP)

### 2. **Enhanced Photo Capture**
- Same PhotoCapture component with improved backend integration
- Photos uploaded to Cloudinary during ticket status updates
- Photos uploaded to Cloudinary during activity stage updates
- Fallback to metadata-only storage if upload fails

### 3. **Photo Gallery Component**
- View all photos associated with tickets or activities
- Thumbnail previews with full-size modal view
- Download functionality for individual photos
- Mobile-responsive design

### 4. **Backend Integration**
- **Ticket Controller**: Enhanced to store photos in Cloudinary
- **Activity Controller**: Enhanced to store photos in Cloudinary
- **Photo Routes**: New API endpoints for photo management
- **Enhanced Storage Service**: Cloudinary integration with database metadata

## API Endpoints

### Photo Management
- `GET /api/tickets/:ticketId/photos` - Get photos for a ticket
- `POST /api/tickets/:ticketId/photos` - Upload photos for a ticket
- `POST /api/activities/:activityId/photos` - Upload photos for an activity

## Database Changes

The `Attachment` model has been enhanced to support:
- Optional `ticketId` (for activity photos)
- Cloudinary URLs in the `path` field
- Public IDs stored in filename for reference

## Photo Requirements (Unchanged)

### Ticket Status Photos Required:
- `ONSITE_VISIT_REACHED`
- `ONSITE_VISIT_IN_PROGRESS`

### Activity Stage Photos Required:
- `ARRIVED`
- `WORK_IN_PROGRESS` 
- `ONSITE_VISIT_IN_PROGRESS`
- `EXECUTION`
- `ASSESSMENT`

## Benefits of Cloudinary Integration

### **Business Benefits:**
- **Legal Evidence**: Photos serve as proof of service delivery
- **Quality Assurance**: Managers can review actual work performed
- **Customer Trust**: Documented evidence of service
- **Compliance**: Industry-required photographic documentation
- **Historical Records**: Track service quality trends

### **Technical Benefits:**
- **Scalability**: Cloud storage handles growth
- **Performance**: CDN delivery for fast loading
- **Backup**: Automatic redundancy and disaster recovery
- **Mobile Optimization**: Automatic image optimization
- **Cost Effective**: Pay-as-you-use pricing model

## Usage Examples

### Using PhotoGallery Component

```tsx
import PhotoGallery from '@/components/photo/PhotoGallery';

// For ticket photos
<PhotoGallery 
  ticketId={123} 
  title="Ticket Verification Photos"
  showUploadTime={true}
/>

// For activity photos  
<PhotoGallery 
  activityId={456}
  title="Activity Verification Photos"
  maxPhotosToShow={5}
/>
```

### Using PhotoUploadService

```tsx
import PhotoUploadService from '@/services/photo-upload.service';

// Upload photos
const result = await PhotoUploadService.uploadPhotos(photos, {
  ticketId: 123,
  type: 'ticket_verification'
});

// Get photos
const photos = await PhotoUploadService.getTicketPhotos(123);
```

## Security Considerations

1. **API Keys**: Never expose API secrets in frontend code
2. **Authentication**: All photo endpoints require authentication
3. **Access Control**: Users can only access photos for their assigned tickets/activities
4. **Data Privacy**: Photos are stored securely in Cloudinary with proper access controls

## Troubleshooting

### Common Issues:

1. **Upload Failures**: Check Cloudinary credentials and network connectivity
2. **Missing Photos**: Verify database ticketId associations
3. **Slow Loading**: Ensure CDN is properly configured
4. **Permission Errors**: Check user authentication and role permissions

### Error Handling:

The system includes comprehensive error handling:
- Fallback to metadata-only storage if Cloudinary fails
- Clear error messages for users
- Detailed logging for administrators
- Graceful degradation for network issues

## Migration from Metadata-Only

If you were previously using metadata-only photo storage:

1. Existing metadata will continue to work
2. New photos will be stored in Cloudinary
3. No data migration required
4. Gradual transition as new photos are captured

## Support

For issues with Cloudinary integration:
1. Check the browser console for error messages
2. Verify environment variables are set correctly
3. Test Cloudinary credentials in their dashboard
4. Check network connectivity and firewall settings

---

**Note**: This implementation provides a robust, scalable photo storage solution that enhances the existing photo capture functionality while maintaining backward compatibility.
