'use client';

import React from 'react';

export default function DashboardErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="bg-red-50 rounded-lg p-6 max-w-2xl mx-auto my-8">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-red-100 rounded-full">
          <div className="w-8 h-8 text-red-600">!</div>
        </div>
        <h3 className="text-lg font-medium text-red-800">Failed to load dashboard</h3>
        <p className="text-red-700">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 mt-2 flex items-center gap-2"
        >
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
