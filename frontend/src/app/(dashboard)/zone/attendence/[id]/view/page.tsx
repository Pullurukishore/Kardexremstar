'use client';

import { useParams } from 'next/navigation';
import AttendanceDetailView from '@/components/attendance/AttendanceDetailView';

export default function AttendanceViewPage() {
  const params = useParams();
  const attendanceId = params.id as string;

  return (
    <AttendanceDetailView
      attendanceId={attendanceId}
      apiEndpoint={`/zone/attendance/${attendanceId}`}
      backUrl="/zone/attendence"
      pageTitle="Zone Attendance Details"
    />
  );
}