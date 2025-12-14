'use client';

// Expert helpdesk targets page
// Uses the same targets management interface as admin
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExpertTargetsPage() {
  const router = useRouter();
  
  // Redirect to admin targets page since expert helpdesk has admin-level access
  useEffect(() => {
    router.push('/admin/targets');
  }, [router]);
  
  return null;
}
