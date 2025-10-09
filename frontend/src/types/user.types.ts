export enum UserRole {
  ADMIN = 'ADMIN',
  ZONE_USER = 'ZONE_USER',
  SERVICE_PERSON = 'SERVICE_PERSON',
  EXTERNAL_USER = 'EXTERNAL_USER',
}

export interface ServiceZone {
  serviceZoneId: number;
  serviceZone: {
    id: number;
    name: string;
  };
}

export type User = {
  id: string | number;  // Handle both string and number IDs
  email: string;
  role: UserRole;
  name: string | null;  // Allow null for name
  isActive?: boolean;
  tokenVersion?: string | number;  // Handle both string and number token versions
  customerId?: string | number | null;  // Handle both string and number
  zoneId?: string | number | null;  // Handle both string and number
  serviceZones?: ServiceZone[];
  // Add other user properties as needed
  [key: string]: any;  // Allow additional properties
};

// Type guard to check if a value is a User
export function isUser(value: any): value is User {
  return (
    value &&
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.email === 'string' &&
    Object.values(UserRole).includes(value.role) &&
    typeof value.name === 'string'
  );
}
