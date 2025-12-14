import React from 'react';
import { getExpertHelpdeskById } from '@/lib/server/expert-helpdesk';
import EditExpertHelpdeskClient from '@/components/admin/EditExpertHelpdeskClient';
import { notFound } from 'next/navigation';

interface EditExpertHelpdeskPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function EditExpertHelpdeskPage({ params }: EditExpertHelpdeskPageProps) {
  const expert = await getExpertHelpdeskById(parseInt(params.id));

  if (!expert) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <EditExpertHelpdeskClient expert={expert} />
    </div>
  );
}
