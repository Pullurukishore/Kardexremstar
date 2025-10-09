'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Image as ImageIcon, 
  Download, 
  ExternalLink,
  Calendar,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PhotoUploadService from '@/services/photo-upload.service';

interface StoredPhoto {
  id: number;
  filename: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  publicId: string;
  size: number;
  createdAt: string;
}

interface PhotoGalleryProps {
  ticketId?: number;
  activityId?: number;
  className?: string;
  title?: string;
  showUploadTime?: boolean;
  maxPhotosToShow?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  ticketId,
  activityId,
  className,
  title = "Verification Photos",
  showUploadTime = true,
  maxPhotosToShow
}) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<StoredPhoto | null>(null);

  // Load photos on component mount
  useEffect(() => {
    loadPhotos();
  }, [ticketId, activityId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (ticketId) {
        result = await PhotoUploadService.getTicketPhotos(ticketId);
      } else if (activityId) {
        result = await PhotoUploadService.getActivityPhotos(activityId);
      } else {
        throw new Error('Either ticketId or activityId must be provided');
      }

      if (result.success && result.photos) {
        const photosToShow = maxPhotosToShow 
          ? result.photos.slice(0, maxPhotosToShow)
          : result.photos;
        setPhotos(photosToShow);
      } else {
        setError(result.error || 'Failed to load photos');
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = async (photo: StoredPhoto) => {
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

      toast({
        title: 'Download Started',
        description: `Downloading ${photo.filename}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the photo',
        variant: 'destructive',
      });
    }
  };

  const openInNewTab = (photo: StoredPhoto) => {
    window.open(photo.cloudinaryUrl, '_blank');
  };

  if (loading) {
    return (
      <Card className={cn("border-2 border-blue-200 bg-blue-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-blue-700">Loading photos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-2 border-red-200 bg-red-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 py-8">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className={cn("border-2 border-gray-200 bg-gray-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 py-8">
            <ImageIcon className="h-5 w-5 text-gray-500" />
            <span className="text-gray-600">No photos available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-2 border-green-200 bg-green-50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-green-600" />
            <CardTitle className="text-green-900">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {photos.length} Photo{photos.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative bg-white rounded-lg border border-green-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Photo Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={photo.thumbnailUrl}
                  alt={`Verification photo ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                  onError={(e) => {
                    // Fallback to main URL if thumbnail fails
                    (e.target as HTMLImageElement).src = photo.cloudinaryUrl;
                  }}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedPhoto(photo)}
                      className="bg-white/90 hover:bg-white"
                    >
                      <ExternalLink className="h-3 w-3" />
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

              {/* Photo Info */}
              <div className="p-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="truncate flex-1">Photo {index + 1}</span>
                  <span>{formatFileSize(photo.size)}</span>
                </div>
                
                {showUploadTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(photo.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Full Size Photo Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <img
                src={selectedPhoto.cloudinaryUrl}
                alt="Full size verification photo"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Close button */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => setSelectedPhoto(null)}
              >
                ✕
              </Button>
              
              {/* Download button */}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoGallery;
