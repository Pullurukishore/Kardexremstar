import { Metadata } from 'next';
import PinManagementClient from './PinManagementClient';

export const metadata: Metadata = {
  title: 'PIN Management - KardexCare Admin',
  description: 'Manage access PIN for secure authentication',
};

export default function PinManagementPage() {
  return <PinManagementClient />;
}
