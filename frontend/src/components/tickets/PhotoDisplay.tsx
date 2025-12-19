import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Camera, 
  Image as ImageIcon, 
  ZoomIn, 
  Download, 
  Clock,
  FileImage,
  X,
  Loader2
} from 'lucide-react';
import PhotoUploadService from '@/services/photo-upload.service';

// Build server base URL for static assets. If NEXT_PUBLIC_API_URL ends with '/api',
// strip it so that '/storage/...' can be fetched from the server root.
const getServerBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
  return raw.replace(/\/(api)\/?$/, '');
};

// Helper to get full URL for local storage photos
const getPhotoUrl = (url: string) => {
  return url.startsWith('/storage') 
    ? `${getServerBaseUrl()}${url}` 
    : url;
};

interface PhotoDisplayProps {
  notes?: string;
  activityId: string;
  ticketId?: number;
  className?: string;
}

interface CloudinaryPhoto {
  id: number;
  filename: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  publicId: string;
  size: number;
  createdAt: string;
}

interface PhotoInfo {
  count: number;
  size: string;
  time: string;
}

// Extract photo information from notes
function extractPhotoInfo(notes: string): PhotoInfo | null {
  if (!notes) return null;

  // Try new Cloudinary format first
  const cloudinaryMatch = notes.match(/📸 Photos: (\d+) verification photo[s]? stored permanently \(([^)]+)\)/);
  const cloudinaryTimeMatch = notes.match(/🕒 Photo Time: ([^\n]+)/);
  
  if (cloudinaryMatch) {
    return {
      count: parseInt(cloudinaryMatch[1]),
      size: cloudinaryMatch[2],
      time: cloudinaryTimeMatch?.[1] || new Date().toLocaleString()
    };
  }

  // Fallback to old metadata format
  const photoMatch = notes.match(/📸 Photos: (\d+) verification photo[s]? captured \(([^)]+)\)/);
  const timeMatch = notes.match(/🕒 Photo Time: ([^\n]+)/);
  
  if (!photoMatch) return null;

  return {
    count: parseInt(photoMatch[1]),
    size: photoMatch[2],
    time: timeMatch?.[1] || 'Unknown time'
  };
}

// Extract photo URLs from notes (both Cloudinary and Local Storage)
function extractPhotoUrls(notes: string): string[] {
  if (!notes) return [];
  
  // Try Cloudinary URLs first
  const cloudinaryMatch = notes.match(/🔗 Cloudinary URLs: ([^\n]+)/);
  if (cloudinaryMatch) {
    return cloudinaryMatch[1].split(', ').map(url => url.trim());
  }
  
  // Try Local Storage URLs
  const localMatch = notes.match(/🔗 Local URLs: ([^\n]+)/);
  if (localMatch) {
    return localMatch[1].split(', ').map(url => url.trim());
  }
  
  // Fallback: extract any /storage/ URLs from notes
  const urlRegex = /\/storage\/images\/[^\s,]+/g;
  const urls = notes.match(urlRegex) || [];
  return urls;
}

// Check if notes contain photo information
export function hasPhotoData(notes?: string): boolean {
  if (!notes) return false;
  return notes.includes('📸 Photos:');
}

// Get notes without photo information
export function getNotesWithoutPhotos(notes?: string): string {
  if (!notes) return '';
  
  // Remove photo information lines (both old and new formats)
  return notes
    .replace(/\n\n📸 Photos: [^\n]+/g, '')
    .replace(/\n🕒 Photo Time: [^\n]+/g, '')
    .replace(/\n🔗 Cloudinary URLs: [^\n]+/g, '')
    .replace(/\n🔗 Local URLs: [^\n]+/g, '') // Remove Local URLs line
    .replace(/🔗 Local URLs: [^\n]+/g, '') // Remove Local URLs without newline
    .replace(/🔗 Cloudinary URLs: [^\n]+/g, '') // Remove Cloudinary URLs without newline
    .replace(/\/storage\/images\/[^\s,\n]+/g, '') // Remove any remaining storage URLs
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

export function PhotoDisplay({ notes, activityId, ticketId, className }: PhotoDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloudinaryPhotos, setCloudinaryPhotos] = useState<CloudinaryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<CloudinaryPhoto | null>(null);
  
  const photoInfo = extractPhotoInfo(notes || '');
  const photoUrls = extractPhotoUrls(notes || '');

  // Load photos immediately when component mounts
  useEffect(() => {
    if (photoUrls.length > 0) {
      // If we have URLs from notes, convert them to CloudinaryPhoto format
      const photosFromUrls = photoUrls.map((url, index) => ({
        id: index,
        filename: `photo_${index + 1}.jpg`,
        cloudinaryUrl: getPhotoUrl(url),
        thumbnailUrl: getPhotoUrl(url),
        publicId: '',
        size: 0,
        createdAt: photoInfo?.time || new Date().toISOString()
      }));
      setCloudinaryPhotos(photosFromUrls);
      setLoading(false);
    } else if (ticketId) {
      loadCloudinaryPhotos();
    } else {
      setLoading(false);
    }
  }, [ticketId, photoUrls.length]);

  const loadCloudinaryPhotos = async () => {
    if (!ticketId) return;
    
    try {
      setLoading(true);
      const result = await PhotoUploadService.getTicketPhotos(ticketId);
      if (result.success && result.photos) {
        // Convert local storage photos to CloudinaryPhoto format
        const convertedPhotos = result.photos.map(photo => ({
          id: photo.id,
          filename: photo.filename,
          cloudinaryUrl: getPhotoUrl(photo.url),
          thumbnailUrl: getPhotoUrl(photo.url),
          publicId: '',
          size: photo.size,
          createdAt: photo.createdAt
        }));
        setCloudinaryPhotos(convertedPhotos);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (photo: CloudinaryPhoto) => {
    try {
      const response = await fetch(photo.cloudinaryUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      }
  };

  if (!photoInfo) return null;

  return (
    <>
      {/* Premium Photo Card with Direct Thumbnails */}
      <div className={`mt-3 overflow-hidden rounded-xl border border-purple-200/60 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/40 shadow-lg shadow-purple-100/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-200/60 ${className}`}>
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg ring-1 ring-white/30">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Photos Captured
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-semibold px-2 py-0.5 backdrop-blur-sm">
              {photoInfo.count} photo{photoInfo.count > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-4 space-y-3">
          {/* Photo Thumbnails Grid - Show directly */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <span className="ml-2 text-xs text-slate-500">Loading photos...</span>
            </div>
          ) : cloudinaryPhotos.length > 0 ? (
            <div className={`grid gap-2 ${cloudinaryPhotos.length === 1 ? 'grid-cols-1' : cloudinaryPhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {cloudinaryPhotos.slice(0, 6).map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-purple-100 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square bg-slate-100">
                    <img
                      src={photo.thumbnailUrl}
                      alt={`Verification photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = photo.cloudinaryUrl;
                      }}
                    />
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-2">
                    <span className="text-white text-[10px] font-medium flex items-center gap-1">
                      <ZoomIn className="h-3 w-3" />
                      View
                    </span>
                  </div>
                </div>
              ))}
              {cloudinaryPhotos.length > 6 && (
                <div 
                  className="aspect-square bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-lg flex items-center justify-center cursor-pointer hover:from-purple-200 hover:to-fuchsia-200 transition-colors border border-purple-200"
                  onClick={() => setIsModalOpen(true)}
                >
                  <div className="text-center">
                    <span className="text-lg font-bold text-purple-700">+{cloudinaryPhotos.length - 6}</span>
                    <p className="text-[10px] text-purple-600">more</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileImage className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {photoInfo.count} Verification Photo{photoInfo.count > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-500">Photos captured but not available for preview</p>
              </div>
            </div>
          )}
          
          {/* Photo Meta Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <FileImage className="h-3 w-3" />
              {photoInfo.size}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(photoInfo.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              Verification Photos ({photoUrls.length || cloudinaryPhotos.length || photoInfo?.count || 0})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-sm text-gray-600">Loading photos...</span>
              </div>
            ) : photoUrls.length > 0 ? (
              <>
                {/* Photo Grid from URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photoUrls.map((url: string, index: number) => (
                    <div key={index} className="group relative bg-white rounded-lg border border-purple-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={getPhotoUrl(url)}
                          alt={`Verification photo ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto({
                            id: index,
                            filename: `photo_${index + 1}.jpg`,
                            cloudinaryUrl: getPhotoUrl(url),
                            thumbnailUrl: getPhotoUrl(url),
                            publicId: '',
                            size: 0,
                            createdAt: new Date().toISOString()
                          })}
                        />
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedPhoto({
                                id: index,
                                filename: `photo_${index + 1}.jpg`,
                                cloudinaryUrl: getPhotoUrl(url),
                                thumbnailUrl: getPhotoUrl(url),
                                publicId: '',
                                size: 0,
                                createdAt: new Date().toISOString()
                              })}
                              className="bg-white/90 hover:bg-white"
                            >
                              <ZoomIn className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = getPhotoUrl(url);
                                link.download = `photo_${index + 1}.jpg`;
                                link.click();
                              }}
                              className="bg-white/90 hover:bg-white"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span className="truncate flex-1">Photo {index + 1}</span>
                          <span>Cloudinary</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{photoInfo?.time || 'Recently captured'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Photo Info Summary */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-800 font-medium">
                      {photoUrls.length} verification photos stored permanently
                    </span>
                    <span className="text-purple-600">
                      Size: {photoInfo?.size || 'Unknown'}
                    </span>
                  </div>
                </div>
              </>
            ) : cloudinaryPhotos.length > 0 ? (
              <>
                {/* Photo Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cloudinaryPhotos.map((photo, index) => (
                    <div key={photo.id} className="group relative bg-white rounded-lg border border-purple-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={photo.thumbnailUrl}
                          alt={`Verification photo ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = photo.cloudinaryUrl;
                          }}
                        />
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedPhoto(photo)}
                              className="bg-white/90 hover:bg-white"
                            >
                              <ZoomIn className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownload(photo)}
                              className="bg-white/90 hover:bg-white"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span className="truncate flex-1">Photo {index + 1}</span>
                          <span>{Math.round(photo.size / 1024)}KB</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(photo.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Photo Info Summary */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-800 font-medium">
                      {cloudinaryPhotos.length} verification photos stored permanently
                    </span>
                    <span className="text-purple-600">
                      Total: {Math.round(cloudinaryPhotos.reduce((sum, p) => sum + p.size, 0) / 1024)}KB
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-purple-600" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {photoInfo.count} Photo{photoInfo.count > 1 ? 's' : ''} Captured
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Photos were captured but may not be available for viewing
                    </p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Photos:</span>
                      <span className="font-medium">{photoInfo.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Size:</span>
                      <span className="font-medium">{photoInfo.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Captured:</span>
                      <span className="font-medium">{photoInfo.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Size Photo Modal */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <img
                src={selectedPhoto.cloudinaryUrl}
                alt="Full size verification photo"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 left-4 bg-white/90 hover:bg-white"
                onClick={() => handleDownload(selectedPhoto)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
