'use client';

// Expert helpdesk forecast page
// Uses the same forecast management interface as admin
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExpertForecastPage() {
  const router = useRouter();
  
  // Redirect to admin forecast page since expert helpdesk has admin-level access
  useEffect(() => {
    router.push('/admin/forecast');
  }, [router]);
  
  return null;
}
