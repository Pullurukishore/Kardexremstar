'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Admin } from '@/lib/server/admin';
import { MobileCard, MobileForm, MobileFormRow, MobileButton } from '@/components/ui/mobile-responsive';
import { ArrowLeft, User, Mail, Phone, Lock, Save, X } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface EditAdminClientProps {
  admin: Admin;
}

export default function EditAdminClient({ admin }: EditAdminClientProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: admin.email || '',
    name: admin.name || '',
    phone: admin.phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const updateData: any = { ...formData };

      const response = await apiClient.put(`/admin/users/${admin.id}`, updateData);

      // Backend returns { user: userData } on success (200 OK means success)
      // The API client wraps the response, so we check for the user data
      if ((response as any).user || response.data) {
        setMessage({ type: 'success', text: 'Administrator updated successfully! Redirecting...' });
        toast.success('Administrator updated successfully!');
        
        // Refresh the router cache and redirect back to admin list
        router.refresh();
        router.push('/admin/manage-admins');
      } else {
        throw new Error(response.message || 'Failed to update admin');
      }
    } catch (error: any) {
      console.error('Error updating admin:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update admin';
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/manage-admins');
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center space-x-3">
        <Link 
          href="/admin/manage-admins"
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Manage Admins</span>
        </Link>
      </div>

      {/* Admin Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{admin.name || 'Administrator'}</h3>
            <p className="text-gray-600">{admin.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                admin.isActive 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  admin.isActive ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                {admin.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Form */}
      <div className="hidden md:block max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Administrator</h2>
                <p className="text-sm text-gray-600">Update administrator information and settings</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {message && (
              <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                  message.type === 'success' ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  {message.type === 'success' ? '✓' : '⚠'}
                </div>
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="+1234567890"
                />
              </div>

            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Updating...' : 'Update Administrator'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Form */}
      <div className="md:hidden">
        <MobileCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                  message.type === 'success' ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  {message.type === 'success' ? '✓' : '⚠'}
                </div>
                <span className="font-medium text-sm">{message.text}</span>
              </div>
            )}

            <MobileForm>
              <MobileFormRow>
                <label htmlFor="mobile-email" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  id="mobile-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </MobileFormRow>

              <MobileFormRow>
                <label htmlFor="mobile-name" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  id="mobile-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </MobileFormRow>

              <MobileFormRow>
                <label htmlFor="mobile-phone" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  id="mobile-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="+1234567890"
                />
              </MobileFormRow>

            </MobileForm>

            <div className="flex flex-col space-y-3 pt-4">
              <MobileButton
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Updating...' : 'Update Administrator'}
              </MobileButton>
              <MobileButton
                type="button"
                onClick={handleCancel}
                variant="secondary"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </MobileButton>
            </div>
          </form>
        </MobileCard>
      </div>
    </div>
  );
}
