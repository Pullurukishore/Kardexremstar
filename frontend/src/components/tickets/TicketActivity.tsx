import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, User, Clock, MapPin, ExternalLink } from 'lucide-react';
import { LocationDisplay, getNotesWithoutLocation, hasLocationData } from './LocationDisplay';
import { PhotoDisplay, hasPhotoData, getNotesWithoutPhotos } from './PhotoDisplay';
import api from '@/lib/api/axios';

// Backend now handles address resolution using the same GeocodingService as attendance

interface TicketActivityProps {
  ticketId: number;
  ticket?: {
    zone?: {
      id: number;
      name: string;
    };
  };
}

interface ActivityItem {
  id: string;
  type: 'STATUS_CHANGE' | 'NOTE';
  description: string;
  data: {
    status?: string;
    notes?: string;
    content?: string;
    [key: string]: any;
  };
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Simplified location display component - backend now handles address resolution
function LocationDisplayWithBackendAddress({ notes, activityId }: { notes?: string; activityId: string }) {
  if (!notes) return null;

  const locationMatch = notes.match(/📍 Location: ([^\n]+)/);
  const coordsMatch = notes.match(/📍 Coordinates: ([^\n]+)/);
  const timeMatch = notes.match(/🕒 Time: ([^\n]+)/);
  
  const location = locationMatch?.[1];
  const coordinates = coordsMatch?.[1];
  const time = timeMatch?.[1];

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-blue-100 rounded-full">
          <MapPin className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-2 py-1 rounded-full">
                📍 LOCATION TRACKED
              </span>
            </div>
            
            <div className="bg-white p-2 rounded-md border border-blue-100">
              {location && (
                <p className="text-sm font-semibold text-gray-900">
                  {location}
                </p>
              )}
              {coordinates && (
                <p className="text-xs text-gray-600 font-mono mt-1">
                  📍 {coordinates}
                </p>
              )}
              {time && (
                <p className="text-xs text-gray-500 mt-1">
                  🕒 {time}
                </p>
              )}
            </div>
            
            {coordinates && (
              <button
                onClick={() => {
                  const [lat, lng] = coordinates.split(', ').map(coord => parseFloat(coord.trim()));
                  if (!isNaN(lat) && !isNaN(lng)) {
                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View on Google Maps
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketActivity({ ticketId, ticket }: { ticketId: number; ticket?: { zone?: { id: number; name: string; } } }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await api.get(`/tickets/${ticketId}/activity`);
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity found for this ticket.
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return <Activity className="h-4 w-4 text-white" />;
      case 'NOTE':
        return <User className="h-4 w-4 text-white" />;
      default:
        return <Clock className="h-4 w-4 text-white" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'bg-blue-500';
      case 'NOTE':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatStatusName = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const isOnsiteVisitStatus = (status: string) => {
    const onsiteStatuses = [
      'ONSITE_VISIT_STARTED',
      'ONSITE_VISIT_REACHED', 
      'ONSITE_VISIT_IN_PROGRESS',
      'ONSITE_VISIT_RESOLVED',
      'ONSITE_VISIT_COMPLETED',
      'ONSITE_VISIT_PENDING',
      'ONSITE_VISIT_PLANNED',
      'ONSITE_VISIT'
    ];
    return onsiteStatuses.includes(status);
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, index) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {index !== activities.length - 1 ? (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center ring-8 ring-background`}>
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {activity.user?.name?.charAt(0).toUpperCase() || activity.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {activity.user?.name || activity.user?.email?.split('@')[0] || 'Unknown User'}
                        </span>
                        {ticket?.zone?.name && (activity.user?.role === 'ZONE_USER' || activity.user?.role === 'SERVICE_PERSON') && (
                          <span className="text-xs text-muted-foreground">Zone: {ticket.zone.name}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {activity.user?.role?.replace('_', ' ').toLowerCase()}
                      </Badge>
                      {/* Show location badge only for onsite visit statuses */}
                      {activity.type === 'STATUS_CHANGE' && activity.data.status && isOnsiteVisitStatus(activity.data.status) && hasLocationData(activity.data.notes) && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          📍 Location
                        </Badge>
                      )}
                      {/* Show photo badge for activities with photos */}
                      {hasPhotoData(activity.data.notes) && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          📸 Photos
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {activity.type === 'STATUS_CHANGE' ? (
                          <>
                            {activity.description} <Badge variant="outline" className="ml-1">{formatStatusName(activity.data.status || '')}</Badge>
                            {activity.data.notes && getNotesWithoutPhotos(getNotesWithoutLocation(activity.data.notes)) && (
                              <span className="block mt-1 text-xs italic">"{getNotesWithoutPhotos(getNotesWithoutLocation(activity.data.notes))}"</span>
                            )}
                          </>
                        ) : (
                          <>
                            {activity.description}
                            {activity.data.content && getNotesWithoutPhotos(getNotesWithoutLocation(activity.data.content)) && (
                              <span className="block mt-1 text-xs italic">"{getNotesWithoutPhotos(getNotesWithoutLocation(activity.data.content))}"</span>
                            )}
                          </>
                        )}
                      </p>
                      
                      {/* Location Display for Onsite Visit Status Changes Only - Backend Address Resolution */}
                      {activity.type === 'STATUS_CHANGE' && activity.data.status && isOnsiteVisitStatus(activity.data.status) && hasLocationData(activity.data.notes) && (
                        <LocationDisplayWithBackendAddress 
                          notes={activity.data.notes} 
                          activityId={activity.id}
                        />
                      )}
                      
                      {/* Photo Display for Activities with Photos */}
                      {hasPhotoData(activity.data.notes) && (
                        <PhotoDisplay 
                          notes={activity.data.notes} 
                          activityId={activity.id}
                          ticketId={ticketId}
                        />
                      )}
                      
                      {/* Location Display for Notes - Disabled as per requirement */}
                      {/* Location display removed from notes as per requirement */}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                    <time dateTime={activity.createdAt.toString()}>
                      {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
