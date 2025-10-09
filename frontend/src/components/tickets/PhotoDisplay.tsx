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

// Extract Cloudinary URLs from notes
function extractCloudinaryUrls(notes: string): string[] {
  if (!notes) return [];
  
  const urlMatch = notes.match(/🔗 Cloudinary URLs: ([^\n]+)/);
  if (!urlMatch) return [];
  
  return urlMatch[1].split(', ').map(url => url.trim());
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
    .trim();
}

export function PhotoDisplay({ notes, activityId, ticketId, className }: PhotoDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloudinaryPhotos, setCloudinaryPhotos] = useState<CloudinaryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<CloudinaryPhoto | null>(null);
  
  const photoInfo = extractPhotoInfo(notes || '');
  const cloudinaryUrls = extractCloudinaryUrls(notes || '');

  // Load Cloudinary photos when component mounts or modal opens
  useEffect(() => {
    if (isModalOpen && ticketId && cloudinaryPhotos.length === 0 && cloudinaryUrls.length === 0) {
      loadCloudinaryPhotos();
    }
  }, [isModalOpen, ticketId, cloudinaryUrls.length]);

  const loadCloudinaryPhotos = async () => {
    if (!ticketId) return;
    
    try {
      setLoading(true);
      const result = await PhotoUploadService.getTicketPhotos(ticketId);
      if (result.success && result.photos) {
        setCloudinaryPhotos(result.photos);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
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
      console.error('Download failed:', error);
    }
  };

  if (!photoInfo) return null;

  return (
    <>
      <div className={`mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-purple-100 rounded-full">
            <Camera className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-800 bg-purple-200 px-2 py-1 rounded-full">
                  📸 PHOTOS CAPTURED
                </span>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {photoInfo.count} photo{photoInfo.count > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="bg-white p-2 rounded-md border border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-purple-600" />
                      {photoInfo.count} Verification Photo{photoInfo.count > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-600">
                      📦 Size: {photoInfo.size}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {photoInfo.time}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs h-7 px-2 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                    >
                      <ZoomIn className="h-3 w-3 mr-1" />
                      {cloudinaryUrls.length > 0 ? 'View Photos' : 'View Photos'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-md border border-purple-100">
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  <span className="font-medium">Onsite Verification:</span>
                  <span>Photos captured to verify service person presence at customer location</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              Verification Photos ({cloudinaryUrls.length || cloudinaryPhotos.length || photoInfo?.count || 0})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-sm text-gray-600">Loading photos...</span>
              </div>
            ) : cloudinaryUrls.length > 0 ? (
              <>
                {/* Photo Grid from URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cloudinaryUrls.map((url, index) => (
                    <div key={index} className="group relative bg-white rounded-lg border border-purple-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={url}
                          alt={`Verification photo ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto({
                            id: index,
                            filename: `photo_${index + 1}.jpg`,
                            cloudinaryUrl: url,
                            thumbnailUrl: url,
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
                                cloudinaryUrl: url,
                                thumbnailUrl: url,
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
                                link.href = url;
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
                      {cloudinaryUrls.length} verification photos stored permanently in Cloudinary
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
