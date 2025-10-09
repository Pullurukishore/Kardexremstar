'use client';

import { MapPin, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type LocationDisplayProps = {
  notes?: string;
  className?: string;
  showMapLink?: boolean;
};

export function LocationDisplay({ notes, className = '', showMapLink = true }: LocationDisplayProps) {
  if (!notes) return null;

  // Extract location information from notes
  const locationMatch = notes.match(/📍 Location: ([^\n]+)/);
  const timeMatch = notes.match(/🕒 Time: ([^\n]+)/);
  const coordsMatch = notes.match(/📍 Coordinates: ([^\n]+)/);

  if (!locationMatch && !coordsMatch) return null;

  const location = locationMatch?.[1];
  const time = timeMatch?.[1];
  const coordinates = coordsMatch?.[1];

  const handleMapClick = () => {
    if (coordinates && showMapLink) {
      const [lat, lng] = coordinates.split(', ').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-600" />
        <Badge variant="secondary" className="text-xs">
          Location Tracked
        </Badge>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
        {location && (
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-blue-900">📍</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">{location}</p>
              {showMapLink && coordinates && (
                <button
                  onClick={handleMapClick}
                  className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Map
                </button>
              )}
            </div>
          </div>
        )}
        
        {time && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">🕒</span>
            <p className="text-sm text-blue-700">{time}</p>
          </div>
        )}
        
        {coordinates && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">📍</span>
            <p className="text-xs text-blue-600 font-mono">{coordinates}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to extract clean notes without location data
export function getNotesWithoutLocation(notes?: string): string {
  if (!notes) return '';
  
  // Remove location information from notes
  return notes
    .replace(/\n\n📍 Location: [^\n]+/g, '')
    .replace(/\n🕒 Time: [^\n]+/g, '')
    .replace(/\n📍 Coordinates: [^\n]+/g, '')
    .trim();
}

// Helper function to check if notes contain location data
export function hasLocationData(notes?: string): boolean {
  if (!notes) return false;
  return notes.includes('📍 Location:') || notes.includes('📍 Coordinates:');
}
