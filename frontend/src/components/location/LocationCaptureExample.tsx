'use client';

import React, { useState } from 'react';
import { MapPin, Clock, Globe } from 'lucide-react';
import LocationCapture from './LocationCapture';
import { LocationResult } from '@/services/LocationService';

const LocationCaptureExample: React.FC = () => {
  const [capturedLocation, setCapturedLocation] = useState<LocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLocationCapture = (result: LocationResult) => {
    console.log('LocationCaptureExample: Location captured:', result);
    setCapturedLocation(result);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    console.error('LocationCaptureExample: Error:', errorMessage);
    setError(errorMessage);
    setCapturedLocation(null);
  };

  const handleReset = () => {
    setCapturedLocation(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Location Capture Demo</h1>
        <p className="text-gray-600">
          Test the location capture component with GPS accuracy validation and map fallback
        </p>
      </div>

      {/* Location Capture Component */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <LocationCapture
          onLocationCapture={handleLocationCapture}
          onError={handleError}
          showAddress={true}
          accuracyThreshold={5000} // 5km threshold
          title="Get Your Location"
          subtitle="We'll try GPS first, then show a map if accuracy is poor"
        />
      </div>

      {/* Results Display */}
      {capturedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Location Captured Successfully!</h3>
          </div>
          
          <div className="space-y-3">
            {/* Coordinates */}
            <div className="flex items-start space-x-3">
              <Globe className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Coordinates:</p>
                <p className="text-sm text-green-700 font-mono">
                  {capturedLocation.location.latitude.toFixed(6)}, {capturedLocation.location.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Address:</p>
                <p className="text-sm text-green-700">{capturedLocation.address}</p>
                <p className="text-xs text-green-600">Source: {capturedLocation.source}</p>
              </div>
            </div>

            {/* Accuracy Info */}
            {capturedLocation.location.accuracy && (
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Accuracy:</p>
                  <p className="text-sm text-green-700">
                    ±{Math.round(capturedLocation.location.accuracy)}m ({capturedLocation.location.accuracyLevel})
                  </p>
                </div>
              </div>
            )}

            {/* Timestamp */}
            {capturedLocation.location.timestamp && (
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Captured At:</p>
                  <p className="text-sm text-green-700">
                    {capturedLocation.location.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* JSON Output for Developers */}
          <details className="mt-4">
            <summary className="text-sm font-medium text-green-800 cursor-pointer hover:text-green-900">
              View Raw Data (for developers)
            </summary>
            <pre className="mt-2 text-xs bg-green-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(capturedLocation, null, 2)}
            </pre>
          </details>

          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Capture Another Location
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-5 w-5 text-red-600">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800">Location Capture Failed</h3>
          </div>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">How It Works</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>✅ <strong>High Accuracy GPS:</strong> If GPS accuracy ≤ 5km, location is accepted immediately</p>
          <p>⚠️ <strong>Poor Accuracy GPS:</strong> If GPS accuracy &gt; 5km, you'll see a warning and map picker</p>
          <p>🗺️ <strong>Map Fallback:</strong> Tap anywhere on the LocationIQ map to set precise location</p>
          <p>📱 <strong>Mobile Optimized:</strong> Works on both desktop and mobile devices</p>
          <p>🔄 <strong>Multiple Sources:</strong> Backend geocoding → Frontend geocoding → Coordinates fallback</p>
        </div>
      </div>

      {/* Integration Example */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Integration Example</h3>
        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`import LocationCapture from '@/components/location/LocationCapture';

<LocationCapture
  onLocationCapture={(result) => {
    console.log('Location:', result.location);
    console.log('Address:', result.address);
    // Use the location data...
  }}
  onError={(error) => {
    console.error('Location error:', error);
  }}
  accuracyThreshold={5000} // 5km
  showAddress={true}
  autoCapture={false}
/>`}
        </pre>
      </div>
    </div>
  );
};

export default LocationCaptureExample;
