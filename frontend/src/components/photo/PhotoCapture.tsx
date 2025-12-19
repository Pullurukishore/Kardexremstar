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
    <div className={cn("bg-white rounded-xl border border-gray-200 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
            <Camera className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{label}</span>
              {required && (
                <span className="px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50 rounded-full">
                  Required
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="font-bold text-purple-600">{capturedPhotos.length}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">{maxPhotos}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Camera Controls - Start Button */}
        {!isCapturing && capturedPhotos.length < maxPhotos && (
          <Button
            onClick={startCamera}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm"
          >
            <Camera className="h-5 w-5 mr-2" />
            Open Camera
          </Button>
        )}

        {/* Camera View */}
        {isCapturing && (
          <div className="space-y-3">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-56 object-cover"
                playsInline
                muted
              />
              
              {/* Camera mode indicator */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium">
                {facingMode === 'environment' ? '📷 Back' : '🤳 Front'}
              </div>

              {/* Capture button overlay */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-3">
                <button
                  onClick={switchCamera}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                
                <button
                  onClick={capturePhoto}
                  disabled={capturedPhotos.length >= maxPhotos}
                  className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-purple-600 rounded-full">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                
                <button
                  onClick={stopCamera}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Captured Photos Grid */}
        {capturedPhotos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center bg-green-100 rounded-full">
                <Check className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {capturedPhotos.length} photo{capturedPhotos.length > 1 ? 's' : ''} captured
              </span>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {capturedPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative flex-shrink-0 group"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                    <img
                      src={photo.dataUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  
                  {/* Photo number */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs font-medium">
                    {index + 1}
                  </div>
                </div>
              ))}
              
              {/* Add more button */}
              {capturedPhotos.length < maxPhotos && !isCapturing && (
                <button
                  onClick={startCamera}
                  className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-purple-400 hover:text-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs mt-1">Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {required && capturedPhotos.length === 0 && !isCapturing && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-amber-700">
              Photo verification is required to continue
            </p>
          </div>
        )}

        {capturedPhotos.length >= maxPhotos && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-sm text-green-700">
              All photos captured! Ready to proceed.
            </p>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PhotoCapture;
