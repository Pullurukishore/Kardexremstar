'use client';

import React from 'react';
import { MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Attendance {
  isCheckedIn: boolean;
  status: string;
  checkInAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface Props {
  attendance: Attendance;
  currentLocation: {latitude: number; longitude: number; address?: string} | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isLocationLoading: boolean;
  canCheckOut: boolean;
}

export default function CheckInOutWidget({
  attendance,
  currentLocation,
  onCheckIn,
  onCheckOut,
  isLocationLoading,
  canCheckOut
}: Props) {
  const isCheckedIn = attendance.isCheckedIn;
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = () => {
    if (isCheckedIn) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (isCheckedIn) return <CheckCircle className="w-5 h-5 text-white" />;
    return <XCircle className="w-5 h-5 text-white" />;
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-md mx-auto p-4">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`${getStatusColor()} rounded-full p-2`}>
              {getStatusIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </h2>
              <p className="text-sm text-gray-600">
                {isCheckedIn ? 'Work Day Active' : 'Ready to Start Work'}
              </p>
            </div>
          </div>
          
          {/* Current Time */}
          <div className="text-right">
            <div className="flex items-center text-gray-600 mb-1">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm">Now</span>
            </div>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>
        </div>

        {/* Check-in Details */}
        {isCheckedIn && attendance.checkInAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700 font-medium">Check-in Time:</span>
              <span className="text-green-800 font-semibold">{formatTime(attendance.checkInAt)}</span>
            </div>
            {attendance.location && (
              <div className="mt-2 flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-700 text-xs leading-relaxed">
                  {attendance.location.address}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Current Location */}
        {currentLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-700 font-medium text-sm">Current Location:</p>
                <p className="text-blue-800 text-xs leading-relaxed">
                  {currentLocation.address || `${currentLocation.latitude}, ${currentLocation.longitude}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isCheckedIn ? (
            <button
              onClick={onCheckIn}
              disabled={isLocationLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold text-center transition-colors"
            >
              {isLocationLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Getting Location...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Check In</span>
                </div>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={onCheckOut}
                disabled={!canCheckOut || isLocationLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold text-center transition-colors"
              >
                {isLocationLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Getting Location...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <XCircle className="w-5 h-5" />
                    <span>Check Out</span>
                  </div>
                )}
              </button>
              
              {!canCheckOut && (
                <p className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  ⚠️ End your current activity before checking out
                </p>
              )}
            </div>
          )}
        </div>

        {/* Location Status */}
        <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{currentLocation ? 'GPS Connected' : 'GPS Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
