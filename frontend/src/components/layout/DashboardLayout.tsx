import { UserRole } from '@/types/user.types';
import { DashboardClientWrapper } from './DashboardClientWrapper';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
}

export function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  return (
    <DashboardClientWrapper userRole={userRole}>
      {children}
    </DashboardClientWrapper>
  );
}