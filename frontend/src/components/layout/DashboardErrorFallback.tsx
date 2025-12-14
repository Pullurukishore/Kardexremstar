"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DashboardErrorFallback() {
  const router = useRouter();

  const handleRetry = () => {
    router.refresh();
  };

  const handleGoToLogin = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Unable to load dashboard
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          We could not connect to the server or verify your session. Please check the backend
          service and try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleRetry}>
            Retry
          </Button>
          <Button variant="outline" onClick={handleGoToLogin}>
            Go to login
          </Button>
        </div>
      </div>
    </div>
  );
}
