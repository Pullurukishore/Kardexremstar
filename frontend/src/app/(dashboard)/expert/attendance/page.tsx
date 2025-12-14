'use client';

// Expert helpdesk attendance page
// Uses the same attendance management interface as admin
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExpertAttendancePage() {
  const router = useRouter();
  
  // Redirect to admin attendance page since expert helpdesk has admin-level access
  useEffect(() => {
    router.push('/admin/attendance');
  }, [router]);
  
  return null;
}
