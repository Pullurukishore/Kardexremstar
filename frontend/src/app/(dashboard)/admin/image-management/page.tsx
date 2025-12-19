'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import apiClient from '@/lib/api/api-client';

interface ImageStats {
  totalImages: number;
  totalSizeBytes: number;
  byMonth: { month: string; count: number; sizeBytes: number }[];
  byType: { type: string; count: number; sizeBytes: number }[];
}

interface ImageItem {
  id: number;
  filename: string;
  url: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  type: string;
  ticketId: number;
  ticketTitle: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ImageManagementPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<ImageStats>('/image-management/stats');
      // Response is wrapped in ApiResponse, but backend returns raw data
      // So check both response.data (wrapped) and response itself (raw)
      const statsData = (response as any)?.data || response;
      if (statsData?.totalImages !== undefined) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchImages = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const response = await apiClient.get<{ images: ImageItem[]; pagination: Pagination }>(`/image-management/images?${params}`);
      // Response could be wrapped in ApiResponse or raw data
      const imagesData = (response as any)?.data || response;
      if (imagesData?.images) {
        setImages(imagesData.images || []);
        setPagination(imagesData.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchImages();
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map(img => img.id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    
    setDownloading(true);
    try {
      // Helper to get cookie (same as api-client.ts)
      const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || null;
        }
        return null;
      };
      
      // Get token from multiple sources (exact same as api-client.ts)
      const token = localStorage.getItem('accessToken') || 
                   localStorage.getItem('token') ||
                   getCookie('accessToken') || 
                   getCookie('token') ||
                   localStorage.getItem('cookie_accessToken');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';
      const res = await fetch(`${apiUrl}/image-management/bulk-download`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds: Array.from(selectedIds) }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images_export_${format(new Date(), 'yyyyMMdd')}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setSelectedIds(new Set());
      } else {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const error = await res.json();
          alert(`Download failed: ${error.error || 'Unknown error'}`);
        } else {
          alert('Download failed: Server error');
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download images');
    } finally {
      setDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setDeleting(true);
    try {
      // Helper to get cookie (same as api-client.ts)
      const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || null;
        }
        return null;
      };
      
      // Get token from multiple sources (exact same as api-client.ts)
      const token = localStorage.getItem('accessToken') || 
                   localStorage.getItem('token') ||
                   getCookie('accessToken') || 
                   getCookie('token') ||
                   localStorage.getItem('cookie_accessToken');
                   
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';
      const res = await fetch(`${apiUrl}/image-management/bulk-delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageIds: Array.from(selectedIds), confirmDelete: true }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Deleted ${result.deletedCount} images. Freed ${result.freedFormatted}`);
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        fetchStats();
        fetchImages(pagination?.page || 1);
      } else {
        const error = await res.json();
        alert(`Delete failed: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete images');
    } finally {
      setDeleting(false);
    }
  };

  const handleFilter = () => {
    fetchImages(1);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">📦 Image Storage Management</h1>
          <p className="text-slate-400">Bulk download and delete images to manage storage space</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
              <div className="text-4xl font-bold">{stats.totalImages.toLocaleString()}</div>
              <div className="text-blue-100">Total Images</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg">
              <div className="text-4xl font-bold">{formatBytes(stats.totalSizeBytes)}</div>
              <div className="text-emerald-100">Total Storage Used</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="text-4xl font-bold">{stats.byMonth.length}</div>
              <div className="text-purple-100">Months with Data</div>
            </div>
          </div>
        )}

        {/* Storage by Month */}
        {stats && stats.byMonth.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">📅 Storage by Month</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.byMonth.slice(0, 12).map(m => (
                <div key={m.month} className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-slate-400">{m.month}</div>
                  <div className="text-lg font-semibold text-white">{m.count}</div>
                  <div className="text-xs text-slate-500">{formatBytes(m.sizeBytes)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <button
              onClick={handleFilter}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Filter
            </button>
            <div className="flex-1" />
            <div className="text-slate-400 text-sm">
              Selected: <span className="text-white font-bold">{selectedIds.size}</span> images
            </div>
            <button
              onClick={handleBulkDownload}
              disabled={selectedIds.size === 0 || downloading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
            >
              {downloading ? '⏳ Downloading...' : '⬇️ Download ZIP'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
            >
              🗑️ Delete Selected
            </button>
          </div>
        </div>

        {/* Images Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={images.length > 0 && selectedIds.size === images.length}
                      onChange={selectAll}
                      className="w-5 h-5 rounded"
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-slate-300">Preview</th>
                  <th className="p-4 text-left text-sm font-medium text-slate-300">Filename</th>
                  <th className="p-4 text-left text-sm font-medium text-slate-300">Size</th>
                  <th className="p-4 text-left text-sm font-medium text-slate-300">Date</th>
                  <th className="p-4 text-left text-sm font-medium text-slate-300">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Loading images...
                    </td>
                  </tr>
                ) : images.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No images found
                    </td>
                  </tr>
                ) : (
                  images.map(img => (
                    <tr
                      key={img.id}
                      className={`border-t border-slate-700 hover:bg-slate-700/30 transition ${
                        selectedIds.has(img.id) ? 'bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(img.id)}
                          onChange={() => toggleSelect(img.id)}
                          className="w-5 h-5 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5003'}${img.url}`}
                          alt={img.filename}
                          className="w-16 h-16 object-cover rounded-lg bg-slate-700"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-white text-sm font-mono truncate max-w-xs">{img.filename}</div>
                      </td>
                      <td className="p-4 text-slate-300">{img.sizeFormatted}</td>
                      <td className="p-4 text-slate-300">
                        {format(new Date(img.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="p-4">
                        <a
                          href={`/admin/tickets/${img.ticketId}/list`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          #{img.ticketId}
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t border-slate-700">
              {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => fetchImages(page)}
                  className={`px-4 py-2 rounded-lg transition ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
            <h3 className="text-2xl font-bold text-white mb-4">⚠️ Confirm Delete</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-red-400">{selectedIds.size}</strong> images?
              <br /><br />
              <span className="text-red-400 font-medium">This action cannot be undone!</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white py-3 rounded-lg font-medium transition"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
