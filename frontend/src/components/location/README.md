# LocationCapture Component

A comprehensive location capture component that works on both web and mobile devices with GPS accuracy validation and map fallback functionality.

## Features

✅ **High-Accuracy GPS**: Requests user's current location with high accuracy enabled  
⚠️ **Accuracy Validation**: Checks GPS accuracy against configurable threshold (default 5km)  
🗺️ **Map Fallback**: Shows LocationIQ Maps picker when GPS accuracy is poor  
📱 **Mobile Optimized**: Responsive design for both desktop and mobile devices  
🔄 **Multiple Geocoding Sources**: Backend → Frontend → Coordinates fallback chain  
🎯 **Production Ready**: Simple, clean UI with proper error handling  

## Components

### LocationCapture
Main component that handles GPS capture and accuracy validation.

### MapPicker  
Interactive map component using LocationIQ and Leaflet for precise location selection.

### EnhancedAttendanceWidget
Enhanced attendance widget that integrates LocationCapture for check-in/check-out.

## Usage

### Basic Usage

```tsx
import { LocationCapture } from '@/components/location';

<LocationCapture
  onLocationCapture={(result) => {
    console.log('Location:', result.location);
    console.log('Address:', result.address);
    console.log('Source:', result.source);
  }}
  onError={(error) => {
    console.error('Location error:', error);
  }}
/>
```

### Advanced Usage

```tsx
<LocationCapture
  onLocationCapture={handleLocationCapture}
  onError={handleLocationError}
  accuracyThreshold={5000} // 5km threshold
  showAddress={true}
  autoCapture={false}
  title="Get Your Location"
  subtitle="We'll try GPS first, then show a map if accuracy is poor"
  className="custom-styles"
/>
```

### With Attendance Widget

```tsx
import { EnhancedAttendanceWidget } from '@/components/location';

<EnhancedAttendanceWidget
  onStatusChange={() => console.log('Attendance status changed')}
  showLocationCapture={true}
  accuracyThreshold={100} // 100m for attendance
/>
```

## Props

### LocationCapture Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onLocationCapture` | `(result: LocationResult) => void` | Required | Callback when location is successfully captured |
| `onError` | `(error: string) => void` | Optional | Callback when location capture fails |
| `className` | `string` | `''` | Additional CSS classes |
| `showAddress` | `boolean` | `true` | Whether to show geocoded address |
| `accuracyThreshold` | `number` | `5000` | Maximum acceptable GPS accuracy in meters |
| `autoCapture` | `boolean` | `false` | Auto-capture location on component mount |
| `title` | `string` | `'Capture Location'` | Component title |
| `subtitle` | `string` | `'Get your current GPS coordinates'` | Component subtitle |

### MapPicker Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onLocationSelect` | `(lat: number, lng: number) => void` | Required | Callback when location is selected on map |
| `initialLocation` | `GPSLocation \| null` | `null` | Initial location to center map |
| `className` | `string` | `''` | Additional CSS classes |

## Data Types

### LocationResult
```typescript
interface LocationResult {
  location: GPSLocation;
  address: string;
  source: 'backend' | 'frontend' | 'coordinates';
}
```

### GPSLocation
```typescript
interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
  isAccurate?: boolean;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor';
}
```

## Accuracy Levels

- **Excellent**: ≤ 10m accuracy
- **Good**: ≤ 50m accuracy  
- **Fair**: ≤ 100m accuracy
- **Poor**: > 100m accuracy

## Accuracy Thresholds by Use Case

- **General Location**: 5000m (5km) - Default for general location capture
- **Attendance Tracking**: 100m - For check-in/check-out accuracy
- **Field Service**: 50m - For onsite work verification
- **Asset Tracking**: 10m - For precise asset location

## Environment Variables

Add to your `.env.local` file:

```env
NEXT_PUBLIC_LOCATIONIQ_API_KEY=your_locationiq_api_key_here
```

If no API key is provided, the component falls back to OpenStreetMap tiles.

## Integration with Existing Systems

The LocationCapture component integrates seamlessly with:

- **LocationService**: Uses existing GPS and geocoding services
- **AttendanceWidget**: Enhanced version with location capture
- **Service Person Dashboard**: Location tracking for activities
- **Ticket Management**: Location-based status updates

## Mobile Optimization

- **Touch-friendly**: Large buttons and touch targets
- **Responsive Design**: Adapts to different screen sizes
- **Performance**: Optimized for mobile GPS and network conditions
- **Battery Efficient**: Smart retry logic and timeout handling

## Error Handling

The component handles various error scenarios:

- **GPS Permission Denied**: Shows helpful message and map fallback
- **GPS Timeout**: Automatic retry with exponential backoff
- **Poor Accuracy**: Warning message with improvement suggestions
- **Network Issues**: Graceful fallback to coordinates display
- **Map Loading Errors**: Fallback to OpenStreetMap tiles

## Browser Compatibility

- **Modern Browsers**: Full functionality with GPS and maps
- **Older Browsers**: Graceful degradation with basic location services
- **Mobile Browsers**: Optimized for mobile GPS and touch interaction
- **PWA Support**: Works in Progressive Web Apps

## Demo

Visit `/demo/location-capture` to see the component in action with:

- Live GPS capture testing
- Accuracy validation demonstration  
- Map picker functionality
- Error handling examples
- Integration code samples

## Files

- `LocationCapture.tsx` - Main location capture component
- `MapPicker.tsx` - Interactive map component  
- `LocationCaptureExample.tsx` - Demo and example usage
- `EnhancedAttendanceWidget.tsx` - Enhanced attendance with location
- `index.ts` - Component exports
- `README.md` - This documentation
