'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, MapPin, Layers, Eye } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActivityStage {
  id: number;
  stage: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface RelatedActivity {
  id: number;
  title: string;
  activityType: string;
  startTime: string;
  endTime?: string;
  location?: string;
  status?: string;
  ActivityStage?: ActivityStage[];
  ticket?: {
    id: number;
    title: string;
    status: string;
  };
}

interface ActivitySchedule {
  id: number;
  title: string;
  description?: string;
  activityType: string;
  priority: string;
  scheduledDate: string;
  estimatedDuration: number;
  location?: string;
  status: string;
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  notes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  relatedActivities?: RelatedActivity[];
  assets?: any[];
  zone?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    companyName: string;
    address?: string;
  };
  ticket?: {
    id: number;
    title: string;
    status: string;
    priority?: string;
    customer?: {
      id: number;
      companyName: string;
      address?: string;
    };
    asset?: {
      id: number;
      serialNo?: string;
      model?: string;
      location?: string;
    };
    contact?: {
      id: number;
      name: string;
      phone?: string;
      email?: string;
    };
  };
  scheduledBy: {
    name: string;
    email: string;
  };
  servicePerson?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function ServicePersonSchedules() {
  const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<ActivitySchedule | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/activity-schedule?status=PENDING,ACCEPTED');
      
      if (response.success) {
        setSchedules(response.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <AlertCircle className="h-4 w-4" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  
  const handleAccept = async (scheduleId: number) => {
    try {
      setIsSubmitting(true);
      const response = await apiClient.patch(`/activity-schedule/${scheduleId}/accept`);
      
      if (response.success) {
        toast.success('Schedule accepted successfully');
        setShowDetailDialog(false);
        fetchSchedules();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (scheduleId: number) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiClient.patch(`/activity-schedule/${scheduleId}/reject`, {
        rejectionReason,
      });
      
      if (response.success) {
        toast.success('Schedule rejected');
        setShowDetailDialog(false);
        setRejectionReason('');
        fetchSchedules();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingSchedules = schedules.filter(s => s.status === 'PENDING');
  const acceptedSchedules = schedules.filter(s => s.status === 'ACCEPTED');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Scheduled Activities</h2>
            <p className="text-xs sm:text-sm text-gray-500">Quick view of your upcoming work</p>
          </div>
        </div>
        {(pendingSchedules.length > 0 || acceptedSchedules.length > 0) && (
          <div className="hidden sm:flex flex-col items-end text-[11px] text-gray-500">
            <span className="font-medium">Pending: {pendingSchedules.length}</span>
            <span>Accepted: {acceptedSchedules.length}</span>
          </div>
        )}
      </div>

      {/* Pending Schedules */}
      {pendingSchedules.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Pending Schedules ({pendingSchedules.length})
            </CardTitle>
            <CardDescription className="text-xs">Activities awaiting your response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-yellow-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">{schedule.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(schedule.scheduledDate)}</span>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{schedule.location}</span>
                        </div>
                      )}
                    </div>
                    <Badge className={`${getPriorityColor(schedule.priority)} text-xs py-0.5 px-2`}>
                      {schedule.priority}
                    </Badge>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-yellow-50/50 rounded border border-yellow-100">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Activity Type</p>
                      <p className="text-xs text-gray-900 font-medium mt-0.5">{schedule.activityType.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Duration</p>
                      <p className="text-xs text-gray-900 font-medium mt-0.5">
                        {schedule.estimatedDuration ? (
                          schedule.estimatedDuration >= 1 
                            ? `${Math.floor(schedule.estimatedDuration)}h ${Math.round((schedule.estimatedDuration % 1) * 60)}m`
                            : `${Math.round(schedule.estimatedDuration * 60)}m`
                        ) : 'N/A'}
                      </p>
                    </div>
                    {schedule.description && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium">Description</p>
                        <p className="text-xs text-gray-900 mt-0.5 line-clamp-1">{schedule.description}</p>
                      </div>
                    )}
                    {schedule.ticket && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium">Related Ticket</p>
                        <p className="text-xs text-gray-900 mt-0.5">
                          <span className="font-semibold">#{schedule.ticket.id}</span> - {schedule.ticket.title}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* View Details Button */}
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={async () => {
                        try {
                          // Fetch full details including relatedActivities
                          const response = await apiClient.get(`/activity-schedule/${schedule.id}`);
                          if (response.success) {
                            // Deduplicate relatedActivities by ID
                            const data = response.data;
                            if (data.relatedActivities && Array.isArray(data.relatedActivities)) {
                              const seen = new Set();
                              data.relatedActivities = data.relatedActivities.filter((activity: any) => {
                                if (seen.has(activity.id)) return false;
                                seen.add(activity.id);
                                return true;
                              });
                            }
                            setSelectedSchedule(data);
                          } else {
                            setSelectedSchedule(schedule);
                          }
                        } catch (error) {
                          console.error('Error fetching schedule details:', error);
                          setSelectedSchedule(schedule);
                        }
                        setShowDetailDialog(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="inline-flex items-center gap-1 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 px-2 py-0.5 text-xs font-medium shadow-sm"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View details</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accepted Schedules */}
      {acceptedSchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Accepted Schedules ({acceptedSchedules.length})
            </CardTitle>
            <CardDescription className="text-xs">Activities you have accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acceptedSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-green-200 rounded-lg p-3 bg-green-50/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">{schedule.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(schedule.scheduledDate)}</span>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{schedule.location}</span>
                        </div>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs py-0.5 px-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      ACCEPTED
                    </Badge>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-green-50 rounded border border-green-100">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Activity Type</p>
                      <p className="text-xs text-gray-900 font-medium mt-0.5">{schedule.activityType.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Duration</p>
                      <p className="text-xs text-gray-900 font-medium mt-0.5">
                        {schedule.estimatedDuration ? (
                          schedule.estimatedDuration >= 1 
                            ? `${Math.floor(schedule.estimatedDuration)}h ${Math.round((schedule.estimatedDuration % 1) * 60)}m`
                            : `${Math.round(schedule.estimatedDuration * 60)}m`
                        ) : 'N/A'}
                      </p>
                    </div>
                    {schedule.description && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium">Description</p>
                        <p className="text-xs text-gray-900 mt-0.5 line-clamp-1">{schedule.description}</p>
                      </div>
                    )}
                    {schedule.ticket && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium">Related Ticket</p>
                        <p className="text-xs text-gray-900 mt-0.5">
                          <span className="font-semibold">#{schedule.ticket.id}</span> - {schedule.ticket.title}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={async () => {
                        try {
                          // Fetch full details including relatedActivities
                          const response = await apiClient.get(`/activity-schedule/${schedule.id}`);
                          if (response.success) {
                            // Deduplicate relatedActivities by ID
                            const data = response.data;
                            if (data.relatedActivities && Array.isArray(data.relatedActivities)) {
                              const seen = new Set();
                              data.relatedActivities = data.relatedActivities.filter((activity: any) => {
                                if (seen.has(activity.id)) return false;
                                seen.add(activity.id);
                                return true;
                              });
                            }
                            setSelectedSchedule(data);
                          } else {
                            setSelectedSchedule(schedule);
                          }
                        } catch (error) {
                          console.error('Error fetching schedule details:', error);
                          setSelectedSchedule(schedule);
                        }
                        setShowDetailDialog(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="inline-flex items-center gap-1 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 px-2 py-0.5 text-xs font-medium shadow-sm"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View details</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Loading schedules...</p>
            </div>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No scheduled activities</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedSchedule && (
            <div className="flex flex-col max-h-[75vh]">
              {/* Gradient header for modern look */}
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-base sm:text-lg font-semibold leading-tight">
                    {selectedSchedule.title}
                  </DialogTitle>
                  <p className="mt-1 text-xs sm:text-sm text-indigo-100 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(selectedSchedule.scheduledDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-white/10 px-2 py-0.5 rounded-full">
                      {getStatusIcon(selectedSchedule.status)}
                      <span className="uppercase tracking-wide">{selectedSchedule.status}</span>
                    </span>
                  </p>
                </DialogHeader>
              </div>

              <div className="px-4 sm:px-6 py-4 space-y-6 overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                {selectedSchedule.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900 mt-1">{selectedSchedule.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Activity Type</label>
                    <p className="text-gray-900 mt-1 font-medium">{selectedSchedule.activityType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <Badge className={getPriorityColor(selectedSchedule.priority)} style={{ marginTop: '0.25rem' }}>
                      {selectedSchedule.priority}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge className={getStatusColor(selectedSchedule.status)} style={{ marginTop: '0.25rem' }}>
                      {selectedSchedule.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Schedule ID</label>
                    <p className="text-gray-900 mt-1 font-semibold">#{selectedSchedule.id}</p>
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Scheduled Date & Time</label>
                    <p className="text-gray-900 mt-1">{formatDate(selectedSchedule.scheduledDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estimated Duration</label>
                    <p className="text-gray-900 mt-1">
                      {selectedSchedule.estimatedDuration ? (
                        selectedSchedule.estimatedDuration >= 1 
                          ? `${Math.floor(selectedSchedule.estimatedDuration)}h ${Math.round((selectedSchedule.estimatedDuration % 1) * 60)}m`
                          : `${Math.round(selectedSchedule.estimatedDuration * 60)}m`
                      ) : 'Not specified'}
                    </p>
                  </div>
                </div>

                {selectedSchedule.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900 mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedSchedule.location}
                    </p>
                  </div>
                )}
              </div>

              {/* Zone & Customer */}
              {(selectedSchedule.zone || selectedSchedule.customer) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Zone & Customer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedSchedule.zone && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <label className="text-sm font-medium text-gray-600">Service Zone</label>
                        <p className="text-gray-900 mt-1 font-medium">{selectedSchedule.zone.name}</p>
                      </div>
                    )}
                    {selectedSchedule.customer && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <label className="text-sm font-medium text-gray-600">Customer</label>
                        <p className="text-gray-900 mt-1 font-medium">{selectedSchedule.customer.companyName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assets */}
              {(selectedSchedule.assets && selectedSchedule.assets.length > 0) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Assets ({selectedSchedule.assets.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedSchedule.assets.map((asset: any, index: number) => (
                      <div key={asset.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">{asset.model}</span>
                          <span className="text-sm text-gray-600">Serial: {asset.serialNo}</span>
                        </div>
                        {asset.location && (
                          <p className="text-sm text-gray-900 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {asset.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSchedule.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedSchedule.notes}</p>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status Timeline</h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(selectedSchedule.createdAt)}</p>
                    </div>
                  </div>
                  {selectedSchedule.acceptedAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Accepted</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedSchedule.acceptedAt)}</p>
                      </div>
                    </div>
                  )}
                  {selectedSchedule.rejectedAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5"></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Rejected</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedSchedule.rejectedAt)}</p>
                        {selectedSchedule.rejectionReason && (
                          <p className="text-sm text-gray-600 mt-1">Reason: {selectedSchedule.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedSchedule.completedAt && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Completed</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedSchedule.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              {selectedSchedule.ticket && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900">Related Ticket</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ticket ID</label>
                      <p className="text-gray-900 mt-1 font-semibold">#{selectedSchedule.ticket.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Title</label>
                      <p className="text-gray-900 mt-1">{selectedSchedule.ticket.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <Badge className="mt-1">{selectedSchedule.ticket.status}</Badge>
                    </div>
                    {selectedSchedule.ticket.priority && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Priority</label>
                        <Badge className={getPriorityColor(selectedSchedule.ticket.priority)} style={{ marginTop: '0.25rem' }}>
                          {selectedSchedule.ticket.priority}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Customer Details */}
                  {selectedSchedule.ticket.customer && (
                    <div className="pt-4 border-t border-blue-200 space-y-3">
                      <h4 className="font-semibold text-gray-900">Customer</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Company Name</label>
                          <p className="text-gray-900 mt-1">{selectedSchedule.ticket.customer.companyName}</p>
                        </div>
                        {selectedSchedule.ticket.customer.address && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Address</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.customer.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact Details */}
                  {selectedSchedule.ticket.contact && (
                    <div className="pt-4 border-t border-blue-200 space-y-3">
                      <h4 className="font-semibold text-gray-900">Contact Person</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Name</label>
                          <p className="text-gray-900 mt-1">{selectedSchedule.ticket.contact.name}</p>
                        </div>
                        {selectedSchedule.ticket.contact.phone && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Phone</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.contact.phone}</p>
                          </div>
                        )}
                        {selectedSchedule.ticket.contact.email && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Email</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.contact.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Asset Details */}
                  {selectedSchedule.ticket.asset && (
                    <div className="pt-4 border-t border-blue-200 space-y-3">
                      <h4 className="font-semibold text-gray-900">Asset / Equipment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSchedule.ticket.asset.model && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Model</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.asset.model}</p>
                          </div>
                        )}
                        {selectedSchedule.ticket.asset.serialNo && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Serial Number</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.asset.serialNo}</p>
                          </div>
                        )}
                        {selectedSchedule.ticket.asset.location && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-600">Location</label>
                            <p className="text-gray-900 mt-1">{selectedSchedule.ticket.asset.location}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions for PENDING */}
              {selectedSchedule.status === 'PENDING' && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAccept(selectedSchedule.id)}
                      disabled={isSubmitting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? 'Processing...' : 'Accept'}
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedSchedule.id)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="flex-1"
                    >
                      {isSubmitting ? 'Processing...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
