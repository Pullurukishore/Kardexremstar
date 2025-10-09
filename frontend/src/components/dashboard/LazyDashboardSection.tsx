'use client';

import React, { ReactNode } from 'react';

interface LazyDashboardSectionProps {
  children: ReactNode;
  className?: string;
}

export default function LazyDashboardSection({ children, className = '' }: LazyDashboardSectionProps) {
  return <div className={`w-full ${className}`}>{children}</div>;
}
