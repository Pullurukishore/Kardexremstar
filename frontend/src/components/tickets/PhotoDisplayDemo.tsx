import React from 'react';
import { PhotoDisplay } from './PhotoDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Demo component to show how photo display works
export function PhotoDisplayDemo() {
  // Example notes with photo information (as would come from backend)
  const sampleNotesWithPhotos = `Status changed to ONSITE_VISIT_REACHED

📍 Location: 123 Main Street, Bangalore, Karnataka, India
🕒 Time: 10/7/2025, 4:00:00 PM
📍 Coordinates: 12.971599, 77.594566

📸 Photos: 2 verification photos captured (1.2MB)
🕒 Photo Time: 10/7/2025, 4:00:15 PM`;

  const sampleNotesWithoutPhotos = `Status changed to IN_PROGRESS

📍 Location: 456 Tech Park, Bangalore, Karnataka, India
🕒 Time: 10/7/2025, 3:30:00 PM
📍 Coordinates: 12.935242, 77.624480`;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Photo Display Demo</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Activity with Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This shows how photos are displayed when captured during onsite visits:
            </p>
            <PhotoDisplay 
              notes={sampleNotesWithPhotos}
              activityId="demo-activity-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity without Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This shows a regular activity without photo capture:
            </p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">No photos captured for this activity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo Information Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium">Backend stores photo metadata in notes:</p>
            <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
{`📸 Photos: 2 verification photos captured (1.2MB)
🕒 Photo Time: 10/7/2025, 4:00:15 PM`}
            </pre>
            <p className="text-xs text-gray-600">
              The PhotoDisplay component parses this format and shows a rich UI
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
