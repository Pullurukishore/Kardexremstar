'use client';

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { STAGE_COLORS, PRODUCT_TYPE_COLORS } from '@/types/reports';
import { formatCrLakh, formatINRFull } from '@/lib/format';

interface Offer {
  id: number;
  offerReferenceNumber: string;
  offerReferenceDate: string | null;
  title: string | null;
  productType: string | null;
  company: string | null;
  location: string | null;
  contactPersonName: string | null;
  contactNumber: string | null;
  email: string | null;
  status: string;
  stage: string;
  priority: string;
  offerValue: number | null;
  poNumber: string | null;
  poValue: number | null;
  contact?: {
    id: number;
    contactPersonName: string;
    contactNumber: string | null;
    email: string | null;
  } | null;
  zone: {
    id: number;
    name: string;
    shortForm: string;
  };
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  updatedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#7C3AED',
};

interface ReportsTableProps {
  offers: Offer[];
  loading: boolean;
  onViewOffer: (offerId: number) => void;
  currentPage: number;
  totalPages: number;
  totalOffers: number;
  onPageChange: (page: number) => void;
}

const OfferRow = memo(({ offer, onViewOffer }: { offer: Offer; onViewOffer: (id: number) => void }) => {
  const stageColor = useMemo(() => STAGE_COLORS[offer.stage] || '#9CA3AF', [offer.stage]);
  const productColor = useMemo(() => 
    offer.productType ? (PRODUCT_TYPE_COLORS[offer.productType] || '#9CA3AF') : '#9CA3AF',
    [offer.productType]
  );

  return (
    <tr className="hover:bg-blue-50/50 transition-all duration-200 border-b border-gray-100 group">
      <td className="py-3.5 px-4">
        <button 
          onClick={() => onViewOffer(offer.id)}
          className="text-left hover:underline focus:outline-none group/link"
        >
          <div className="font-semibold text-blue-600 hover:text-blue-800 text-sm group-hover/link:underline">
            {offer.offerReferenceNumber}
          </div>
          {offer.title && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{offer.title}</div>
          )}
        </button>
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm font-medium text-gray-900">{offer.company || 'N/A'}</div>
        {offer.location && (
          <div className="text-xs text-gray-500 mt-1">{offer.location}</div>
        )}
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm text-gray-900">{offer.contact?.contactPersonName || offer.contactPersonName || 'N/A'}</div>
        {(offer.contact?.contactNumber || offer.contactNumber) && (
          <div className="text-xs text-gray-500 mt-1">{offer.contact?.contactNumber || offer.contactNumber}</div>
        )}
      </td>
      <td className="py-3.5 px-4">
        <Badge 
          style={{ backgroundColor: productColor, color: 'white' }}
          className="text-xs font-medium shadow-sm"
        >
          {offer.productType || 'N/A'}
        </Badge>
      </td>
      <td className="py-3.5 px-4">
        <Badge 
          style={{ backgroundColor: stageColor, color: 'white' }}
          className="text-xs font-medium shadow-sm"
        >
          {offer.stage}
        </Badge>
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm font-semibold text-gray-900" title={offer.offerValue ? formatINRFull(offer.offerValue) : undefined}>
          {offer.offerValue ? formatCrLakh(offer.offerValue) : 'N/A'}
        </div>
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm text-gray-700 font-medium">{offer.zone.name}</div>
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm text-gray-900">{offer.createdBy.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {format(new Date(offer.createdAt), 'MMM dd, yyyy')}
        </div>
      </td>
      <td className="py-3.5 px-4">
        <div className="text-sm text-gray-900">
          {offer.poNumber || 'N/A'}
        </div>
        {offer.poValue && (
          <div className="text-xs text-gray-500 mt-0.5" title={formatINRFull(offer.poValue)}>
            {formatCrLakh(offer.poValue)}
          </div>
        )}
      </td>
      <td className="py-3.5 px-4">
        <div className="text-xs text-gray-500">
          {format(new Date(offer.updatedAt), 'MMM dd, yyyy')}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          by {offer.updatedBy.name}
        </div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewOffer(offer.id)}
          className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all duration-200 shadow-sm"
          title="View details"
        >
          <Eye className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">View</span>
        </Button>
      </td>
    </tr>
  );
});

OfferRow.displayName = 'OfferRow';

const ReportsTable: React.FC<ReportsTableProps> = ({
  offers,
  loading,
  onViewOffer,
  currentPage,
  totalPages,
  totalOffers,
  onPageChange,
}) => {
  if (loading && offers.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading offers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (offers.length === 0) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-900">Offers</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No offers found matching your filters.</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 border-b border-gray-200 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            Offers 
            <span className="px-2.5 py-0.5 bg-blue-600 text-white text-sm rounded-full font-semibold">
              {totalOffers}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-slate-100 border-b-2 border-gray-200">
              <tr>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[150px]">
                  Offer Ref
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[150px]">
                  Company
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[140px]">
                  Contact
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                  Product Type
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[110px]">
                  Stage
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[100px]">
                  Offer Value
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[100px]">
                  Zone
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                  Created By
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                  PO Number
                </th>
                <th className="text-left py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                  Last Updated
                </th>
                <th className="text-center py-3.5 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {offers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} onViewOffer={onViewOffer} />
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="text-sm text-gray-600 font-medium">
              Showing <span className="text-gray-900 font-semibold">{((currentPage - 1) * 50) + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * 50, totalOffers)}</span> of <span className="text-blue-600 font-semibold">{totalOffers}</span> offers
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 px-3 border-gray-300 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-gray-700 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                Page <span className="text-blue-600">{currentPage}</span> of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-9 px-3 border-gray-300 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsTable;

