import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, User, Clock, MapPin, ExternalLink, FileText, Download, Navigation, Globe, CheckCircle2, AlertCircle, Camera, Calendar, UserCheck } from 'lucide-react';
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
  type: 'STATUS_CHANGE' | 'NOTE' | 'REPORT_UPLOADED' | 'SCHEDULED';
  description: string;
  data: {
    status?: string;
    notes?: string;
    content?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    reportId?: number;
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

// Premium Location Display Component with glassmorphism and modern design
function LocationDisplayWithBackendAddress({ notes, activityId, locationData }: { notes?: string; activityId: string; locationData?: { location?: string; latitude?: number; longitude?: number; accuracy?: number; locationSource?: string; } }) {
  if (!notes && !locationData) return null;

  const locationMatch = notes?.match(/📍 Location: ([^\n]+)/);
  const coordsMatch = notes?.match(/📍 Coordinates: ([^\n]+)/);
  const timeMatch = notes?.match(/🕒 Time: ([^\n]+)/);
  const sourceMatch = notes?.match(/📌 Source: ([^\n]+)/);
  
  const hasStructured = !!(locationData && (locationData.location || (locationData.latitude && locationData.longitude)));
  const computedSource = locationData?.locationSource === 'manual'
    ? '✓ Manual'
    : (locationData?.accuracy !== undefined && locationData?.accuracy !== null)
      ? (locationData.accuracy <= 100 ? `✓ Accurate (${Math.round(locationData.accuracy)}m)` : `⚠ Low Accuracy (${Math.round(locationData.accuracy)}m)`)
      : undefined;
  
  const location = hasStructured ? (locationData?.location) : locationMatch?.[1];
  const coordinates = hasStructured && locationData?.latitude !== undefined && locationData?.longitude !== undefined
    ? `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
    : coordsMatch?.[1];
  const time = timeMatch?.[1];
  const source = hasStructured ? computedSource : sourceMatch?.[1];

  const isAccurate = source?.includes('Accurate') || source?.includes('Manual');

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 shadow-lg shadow-blue-100/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-200/60">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg ring-1 ring-white/30">
              <Navigation className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Location Tracked
            </span>
          </div>
          {source && (
            <Badge 
              className={`text-[10px] font-semibold px-2 py-0.5 ${
                isAccurate
                  ? 'bg-emerald-500/90 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/25'
                  : 'bg-amber-500/90 text-white border-amber-400/50 shadow-sm shadow-amber-500/25'
              }`}
            >
              <span className="flex items-center gap-1">
                {isAccurate ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                {source.replace('✓ ', '').replace('⚠ ', '')}
              </span>
            </Badge>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 space-y-3">
        {/* Address Display */}
        {location && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shadow-inner">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-relaxed">
                {location}
              </p>
            </div>
          </div>
        )}
        
        {/* Coordinates & Time */}
        <div className="grid gap-2">
          {coordinates && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100">
              <div className="p-1 bg-rose-100 rounded-md">
                <Globe className="h-3 w-3 text-rose-500" />
              </div>
              <span className="text-xs font-mono font-medium text-slate-600">
                {coordinates}
              </span>
            </div>
          )}
          
          {time && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100">
              <div className="p-1 bg-violet-100 rounded-md">
                <Clock className="h-3 w-3 text-violet-500" />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {time}
              </span>
            </div>
          )}
        </div>
        
        {/* Google Maps Button */}
        {coordinates && (
          <button
            onClick={() => {
              const [lat, lng] = coordinates.split(', ').map(coord => parseFloat(coord.trim()));
              if (!isNaN(lat) && !isNaN(lng)) {
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200 group"
          >
            <ExternalLink className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            View on Google Maps
          </button>
        )}
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
      case 'REPORT_UPLOADED':
        return <FileText className="h-4 w-4 text-white" />;
      case 'SCHEDULED':
        return <Calendar className="h-4 w-4 text-white" />;
      default:
        return <Clock className="h-4 w-4 text-white" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 shadow-lg shadow-blue-500/30';
      case 'NOTE':
        return 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 shadow-lg shadow-emerald-500/30';
      case 'REPORT_UPLOADED':
        return 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/30';
      case 'SCHEDULED':
        return 'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/30';
      default:
        return 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 shadow-lg shadow-slate-500/30';
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
      <ul className="-mb-8 space-y-1">
        {activities.map((activity, index) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {index !== activities.length - 1 ? (
                <span
                  className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-4">
                <div>
                  <span className={`h-9 w-9 rounded-xl ${getActivityColor(activity.type)} flex items-center justify-center ring-4 ring-white`}>
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-0.5">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar className="h-7 w-7 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                          {activity.user?.name?.charAt(0).toUpperCase() || activity.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-800">
                          {activity.user?.name || activity.user?.email?.split('@')[0] || 'Unknown User'}
                        </span>
                        {ticket?.zone?.name && (activity.user?.role === 'ZONE_USER' || activity.user?.role === 'SERVICE_PERSON') && (
                          <span className="text-xs text-slate-500">Zone: {ticket.zone.name}</span>
                        )}
                      </div>
                      <Badge className="text-[10px] font-medium bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 border-slate-200 shadow-sm">
                        {activity.user?.role?.replace('_', ' ').toLowerCase()}
                      </Badge>
                      {/* Show location badge only for onsite visit statuses */}
                      {activity.type === 'STATUS_CHANGE' && activity.data.status && isOnsiteVisitStatus(activity.data.status) && ((activity.data.location || (activity.data.latitude && activity.data.longitude)) || hasLocationData(activity.data.notes)) && (
                        <Badge className="text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-sm shadow-blue-500/25">
                          <MapPin className="h-2.5 w-2.5 mr-1" />
                          Location
                        </Badge>
                      )}
                      {/* Show photo badge for activities with photos */}
                      {hasPhotoData(activity.data.notes) && (
                        <Badge className="text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-0 shadow-sm shadow-purple-500/25">
                          <Camera className="h-2.5 w-2.5 mr-1" />
                          Photos
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
                        ) : activity.type === 'REPORT_UPLOADED' ? (
                          <>
                            <span className="font-medium">Uploaded report</span>
                            {activity.data.fileName && (
                              <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium text-purple-900">{activity.data.fileName}</span>
                                  {activity.data.fileSize && (
                                    <Badge variant="secondary" className="text-xs">
                                      {(activity.data.fileSize / 1024).toFixed(1)} KB
                                    </Badge>
                                  )}
                                </div>
                                {activity.data.reportId && (
                                  <a
                                    href={`/api/tickets/${ticketId}/reports/${activity.data.reportId}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download Report
                                  </a>
                                )}
                              </div>
                            )}
                          </>
                        ) : activity.type === 'SCHEDULED' ? (
                          <>
                            <span className="font-medium">{activity.description}</span>
                            {/* Scheduled Activity Premium Card */}
                            <div className="mt-3 overflow-hidden rounded-xl border border-orange-200/60 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40 shadow-lg shadow-orange-100/50">
                              {/* Premium Header */}
                              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg ring-1 ring-white/30">
                                      <Calendar className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                                      Activity Scheduled
                                    </span>
                                  </div>
                                  <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${
                                    activity.data.status === 'COMPLETED' ? 'bg-emerald-500/90 text-white' :
                                    activity.data.status === 'ACCEPTED' ? 'bg-blue-500/90 text-white' :
                                    activity.data.status === 'REJECTED' ? 'bg-red-500/90 text-white' :
                                    'bg-white/20 text-white'
                                  }`}>
                                    {activity.data.status?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Content Area */}
                              <div className="p-4 space-y-3">
                                {/* Service Person */}
                                {activity.data.servicePerson && (
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg shadow-inner">
                                      <UserCheck className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-800 text-sm">
                                        {activity.data.servicePerson.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Assigned Service Person
                                      </p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Schedule Details */}
                                <div className="grid grid-cols-2 gap-2">
                                  {activity.data.scheduledDate && (
                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100">
                                      <div className="p-1 bg-blue-100 rounded-md">
                                        <Calendar className="h-3 w-3 text-blue-500" />
                                      </div>
                                      <span className="text-xs font-medium text-slate-600">
                                        {format(new Date(activity.data.scheduledDate), 'MMM d, yyyy')}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {activity.data.activityType && (
                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100">
                                      <div className="p-1 bg-violet-100 rounded-md">
                                        <Activity className="h-3 w-3 text-violet-500" />
                                      </div>
                                      <span className="text-xs font-medium text-slate-600 truncate">
                                        {activity.data.activityType.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Notes if present */}
                                {activity.data.notes && (
                                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                    "{activity.data.notes}"
                                  </div>
                                )}
                              </div>
                            </div>
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
                      {activity.type === 'STATUS_CHANGE' && activity.data.status && isOnsiteVisitStatus(activity.data.status) && ((activity.data.location || (activity.data.latitude && activity.data.longitude)) || hasLocationData(activity.data.notes)) && (
                        <LocationDisplayWithBackendAddress 
                          notes={activity.data.notes} 
                          activityId={activity.id}
                          locationData={{
                            location: activity.data.location,
                            latitude: activity.data.latitude,
                            longitude: activity.data.longitude,
                            accuracy: activity.data.accuracy,
                            locationSource: activity.data.locationSource
                          }}
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
                  <div className="whitespace-nowrap text-right">
                    <time 
                      dateTime={activity.createdAt.toString()} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-200/60 shadow-sm"
                    >
                      <Clock className="h-3 w-3 text-slate-400" />
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
