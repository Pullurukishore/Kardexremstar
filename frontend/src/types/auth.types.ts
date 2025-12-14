import { UserRole } from '@/types/user.types';

export interface AuthResponseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  // Add other user properties as needed
}
