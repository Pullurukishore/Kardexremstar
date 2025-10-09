'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  X, 
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  filename: string;
  size: number;
}

interface PhotoCaptureProps {
  onPhotoCapture: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  required?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCapture,
  maxPhotos = 3,
  required = false,
  className,
  label = "Photo Verification",
  description = "Take photos for verification"
}) => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Failed to access camera. Please check permissions.',
        variant: 'destructive',
      });
      setIsCapturing(false);
    }
  }, [facingMode, stream, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Calculate approximate size
    const sizeInBytes = Math.round((dataUrl.length * 3) / 4);

    const newPhoto: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: new Date().toISOString(),
      filename: `onsite_photo_${new Date().toISOString().split('T')[0]}_${Date.now()}.jpg`,
      size: sizeInBytes
    };

    const updatedPhotos = [...capturedPhotos, newPhoto];
    setCapturedPhotos(updatedPhotos);
    onPhotoCapture(updatedPhotos);

    toast({
      title: 'Photo Captured',
      description: `Photo saved successfully (${Math.round(sizeInBytes / 1024)}KB)`,
    });

    // Stop camera after capturing if we've reached max photos
    if (updatedPhotos.length >= maxPhotos) {
      stopCamera();
    }
  }, [capturedPhotos, maxPhotos, onPhotoCapture, stopCamera, toast]);

  // Delete photo
  const deletePhoto = useCallback((photoId: string) => {
    const updatedPhotos = capturedPhotos.filter(photo => photo.id !== photoId);
    setCapturedPhotos(updatedPhotos);
    onPhotoCapture(updatedPhotos);
    
    toast({
      title: 'Photo Deleted',
      description: 'Photo removed successfully',
    });
  }, [capturedPhotos, onPhotoCapture, toast]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isCapturing) {
      // Restart camera with new facing mode
      setTimeout(() => startCamera(), 100);
    }
  }, [isCapturing, startCamera]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <Card className={cn("border-2 border-blue-200 bg-blue-50", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">{label}</span>
              {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
            </div>
            <Badge variant="secondary" className="text-xs">
              {capturedPhotos.length}/{maxPhotos} Photos
            </Badge>
          </div>

          {description && (
            <p className="text-sm text-blue-700">{description}</p>
          )}

          {/* Camera Controls */}
          {!isCapturing && capturedPhotos.length < maxPhotos && (
            <div className="space-y-2">
              <Button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              <p className="text-xs text-blue-600 text-center">
                Take photos to verify your onsite presence
              </p>
            </div>
          )}

          {/* Camera View */}
          {isCapturing && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                />
                
                {/* Camera overlay */}
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="sm"
                  className="bg-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  disabled={capturedPhotos.length >= maxPhotos}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture
                </Button>
                
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  size="sm"
                  className="bg-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-blue-600 text-center">
                Position camera to capture clear verification photo
              </p>
            </div>
          )}

          {/* Captured Photos */}
          {capturedPhotos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {capturedPhotos.length} Photo{capturedPhotos.length > 1 ? 's' : ''} Captured
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                  >
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={photo.dataUrl}
                        alt={`Captured photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Photo {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(photo.size)} • {new Date(photo.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => deletePhoto(photo.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {required && capturedPhotos.length === 0 && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                Photo verification is required for onsite visits
              </span>
            </div>
          )}

          {capturedPhotos.length >= maxPhotos && (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Maximum photos captured. Ready to proceed.
              </span>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default PhotoCapture;
