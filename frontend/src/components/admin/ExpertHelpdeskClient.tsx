'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExpertHelpdesk } from '@/lib/server/expert-helpdesk';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, UserX, Zap, Pencil as Edit2, Lock, Trash2, Search } from 'lucide-react';

interface ExpertHelpdeskStats {
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

interface ExpertHelpdeskClientProps {
  initialExperts: ExpertHelpdesk[];
  initialStats: ExpertHelpdeskStats;
  initialPagination: Pagination;
  searchParams: {
    search?: string;
    page?: string;
  };
}

export default function ExpertHelpdeskClient({ 
  initialExperts, 
  initialStats, 
  initialPagination,
  searchParams 
}: ExpertHelpdeskClientProps) {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; expert: ExpertHelpdesk | null }>({
    show: false,
    expert: null
  });
  const [deleting, setDeleting] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');

  const handleDeleteClick = (expert: ExpertHelpdesk) => {
    setDeleteConfirm({ show: true, expert });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.expert) return;
    
    const expertToDelete = deleteConfirm.expert;
    setDeleting(expertToDelete.id);
    
    try {
      await apiClient.delete(`/admin/users/${expertToDelete.id}`);
      
      toast.success(`Expert Helpdesk "${expertToDelete.name || expertToDelete.email}" deleted successfully`);
      setDeleteConfirm({ show: false, expert: null });
      
      router.refresh();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete expert';
      toast.error(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, expert: null });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    router.push(`/admin/manage-expert-helpdesk?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Experts</p>
              <p className="text-2xl font-bold text-blue-900">{initialStats?.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-600 rounded-lg">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{initialStats?.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-600 rounded-lg">
              <UserX className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Inactive</p>
              <p className="text-2xl font-bold text-red-900">{initialStats?.inactive || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-amber-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-amber-600">Recently Active</p>
              <p className="text-2xl font-bold text-amber-900">{initialStats?.recentlyActive || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Expert Helpdesk List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Expert Helpdesk Users</h3>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {initialExperts?.length || 0}
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {initialExperts?.length > 0 ? (
            initialExperts.map((expert) => (
              <div key={expert.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                {/* Mobile Layout */}
                <div className="block sm:hidden space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900 truncate">
                        {expert.name || 'Expert'}
                      </h4>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <span className="mr-1">📧</span>
                        <span className="truncate">{expert.email}</span>
                      </div>
                      {expert.phone && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <span className="mr-1">📱</span>
                          <span>{expert.phone}</span>
                        </div>
                      )}
                      {expert.specialization && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <span className="mr-1">🎯</span>
                          <span className="truncate">{expert.specialization}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      expert.isActive 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        expert.isActive ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      {expert.isActive ? 'Active' : 'Inactive'}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      <Link 
                        href={`/admin/manage-expert-helpdesk/${expert.id}/edit`}
                        className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Edit Expert"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <Link 
                        href={`/admin/manage-expert-helpdesk/${expert.id}/password`}
                        className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Change Password"
                      >
                        <Lock className="h-4 w-4" />
                      </Link>
                      <button 
                        onClick={() => handleDeleteClick(expert)}
                        disabled={deleting === expert.id}
                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete Expert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {expert.name || 'Expert'}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-1">📧</span>
                          {expert.email}
                        </div>
                        {expert.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="mr-1">📱</span>
                            {expert.phone}
                          </div>
                        )}
                      </div>
                      {expert.specialization && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <span className="mr-1">🎯</span>
                          {expert.specialization}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expert.isActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            expert.isActive ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          {expert.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link 
                      href={`/admin/manage-expert-helpdesk/${expert.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Expert"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <Link 
                      href={`/admin/manage-expert-helpdesk/${expert.id}/password`}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Change Password"
                    >
                      <Lock className="h-4 w-4" />
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(expert)}
                      disabled={deleting === expert.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Expert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {expert.lastActiveAt && (
                  <div className="mt-3 text-xs text-gray-500 sm:mt-3">
                    Last active: {new Date(expert.lastActiveAt).toLocaleDateString('en-US', {
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
              <Zap className="h-12 w-12 text-gray-300 rounded mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expert helpdesk users found</h3>
              <p className="text-gray-500">Get started by adding your first expert helpdesk user.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && deleteConfirm.expert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Expert Helpdesk</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Are you sure you want to delete:</span>
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-red-900">
                    {deleteConfirm.expert.name || 'Expert'}
                  </p>
                  <p className="text-sm text-red-700">{deleteConfirm.expert.email}</p>
                  {deleteConfirm.expert.phone && (
                    <p className="text-sm text-red-700">{deleteConfirm.expert.phone}</p>
                  )}
                  {deleteConfirm.expert.specialization && (
                    <p className="text-sm text-red-700">Specialization: {deleteConfirm.expert.specialization}</p>
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
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Expert</span>
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
