'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Admin } from '@/lib/server/admin';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AdminStats {
  total: number;
  active: number;
  inactive: number;
  recentlyActive: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminClientProps {
  initialAdmins: Admin[];
  initialStats: AdminStats;
  initialPagination: Pagination;
  searchParams: {
    search?: string;
    page?: string;
  };
}

export default function AdminClient({ 
  initialAdmins, 
  initialStats, 
  initialPagination,
  searchParams 
}: AdminClientProps) {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; admin: Admin | null }>({
    show: false,
    admin: null
  });
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDeleteClick = (admin: Admin) => {
    setDeleteConfirm({ show: true, admin });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.admin) return;
    
    const adminToDelete = deleteConfirm.admin;
    setDeleting(adminToDelete.id);
    
    try {
      await apiClient.delete(`/admin/users/${adminToDelete.id}`);
      
      toast.success(`Administrator "${adminToDelete.name || adminToDelete.email}" deleted successfully`);
      setDeleteConfirm({ show: false, admin: null });
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete administrator';
      toast.error(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, admin: null });
  };
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-600 rounded-lg">
              <div className="h-6 w-6 bg-white rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Admins</p>
              <p className="text-2xl font-bold text-blue-900">{initialStats?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-green-600 rounded-lg">
              <div className="h-6 w-6 bg-white rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{initialStats?.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-red-600 rounded-lg">
              <div className="h-6 w-6 bg-white rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Inactive</p>
              <p className="text-2xl font-bold text-red-900">{initialStats?.inactive || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-600 rounded-lg">
              <div className="h-6 w-6 bg-white rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Recently Active</p>
              <p className="text-2xl font-bold text-purple-900">{initialStats?.recentlyActive || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Administrators List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-600 rounded mr-2"></div>
            <h3 className="text-lg font-semibold text-gray-900">Administrators</h3>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {initialAdmins?.length || 0}
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {initialAdmins?.length > 0 ? (
            initialAdmins.map((admin) => (
              <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <div className="h-6 w-6 bg-white rounded"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {admin.name || 'Administrator'}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-1">📧</span>
                          {admin.email}
                        </div>
                        {admin.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="mr-1">📱</span>
                            {admin.phone}
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.isActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            admin.isActive ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link 
                      href={`/admin/manage-admins/${admin.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Administrator"
                    >
                      ✏️
                    </Link>
                    <Link 
                      href={`/admin/manage-admins/${admin.id}/password`}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Change Password"
                    >
                      🔑
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(admin)}
                      disabled={deleting === admin.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Administrator"
                    >
                      {deleting === admin.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
                
                {admin.lastActiveAt && (
                  <div className="mt-3 text-xs text-gray-500">
                    Last active: {new Date(admin.lastActiveAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="h-12 w-12 bg-gray-300 rounded mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
              <p className="text-gray-500">Get started by adding your first administrator.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && deleteConfirm.admin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Administrator</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Are you sure you want to delete:</span>
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-red-900">
                    {deleteConfirm.admin.name || 'Administrator'}
                  </p>
                  <p className="text-sm text-red-700">{deleteConfirm.admin.email}</p>
                  {deleteConfirm.admin.phone && (
                    <p className="text-sm text-red-700">{deleteConfirm.admin.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting !== null}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting !== null}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {deleting !== null ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Delete Administrator</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
