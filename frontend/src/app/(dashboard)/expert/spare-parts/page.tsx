'use client';

// Expert helpdesk spare parts page
// Uses the same spare parts management interface as admin
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExpertSparepartsPage() {
  const router = useRouter();
  
  // Redirect to admin spare parts page since expert helpdesk has admin-level access
  useEffect(() => {
    router.push('/admin/spare-parts');
  }, [router]);
  
  return null;
}
