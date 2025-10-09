'use client';

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Eye, 
  Pencil, 
  Trash2, 
  Users,
  Plus
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface VirtualizedCustomerTableProps {
  customers: Customer[];
}

// Virtual scrolling configuration
const ITEM_HEIGHT = 80; // Height of each row in pixels
const CONTAINER_HEIGHT = 600; // Height of the scrollable container
const BUFFER_SIZE = 5; // Number of extra items to render outside viewport

const CustomerRow = memo(({ customer, style }: { customer: Customer; style: React.CSSProperties }) => {
  const primaryContact = useMemo(() => {
    return customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : null;
  }, [customer.contacts]);

  const companyInitial = useMemo(() => {
    return customer.companyName.charAt(0).toUpperCase();
  }, [customer.companyName]);

  return (
    <div 
      style={style}
      className="flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors duration-200"
    >
      {/* Company Info - 30% */}
      <div className="flex items-center gap-3 w-[30%] min-w-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {companyInitial}
        </div>
        <div className="min-w-0 flex-1">
          <Link 
            href={`/admin/customers/${customer.id}`}
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block truncate"
          >
            {customer.companyName}
          </Link>
          {customer.serviceZone?.name && (
            <div className="text-sm text-gray-500 flex items-center mt-1">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{customer.serviceZone.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Location - 20% */}
      <div className="w-[20%] min-w-0 px-2">
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{customer.address || 'No address'}</span>
        </div>
      </div>

      {/* Contact - 25% */}
      <div className="w-[25%] min-w-0 px-2">
        {primaryContact ? (
          <div className="space-y-1">
            {primaryContact.name && (
              <div className="font-medium text-gray-900 truncate">{primaryContact.name}</div>
            )}
            {primaryContact.email && (
              <div className="flex items-center text-sm text-gray-500">
                <Mail className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                <a 
                  href={`mailto:${primaryContact.email}`} 
                  className="hover:underline truncate hover:text-blue-600"
                >
                  {primaryContact.email}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400 flex items-center">
            <Users className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">
              {customer._count?.contacts ? `${customer._count.contacts} contacts` : 'No contacts'}
            </span>
          </div>
        )}
      </div>

      {/* Stats - 15% */}
      <div className="w-[15%] flex items-center justify-center gap-4">
        <Badge 
          variant="outline" 
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          {customer._count?.assets || 0}
        </Badge>
        <Badge 
          variant="outline" 
          className="bg-orange-50 text-orange-700 border-orange-200"
        >
          {customer._count?.tickets || 0}
        </Badge>
      </div>

      {/* Status & Actions - 10% */}
      <div className="w-[10%] flex items-center justify-end gap-2">
        <Badge 
          className={cn(
            'capitalize font-medium',
            customer.isActive 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-gray-100 text-gray-800 border-gray-200'
          )}
          variant="outline"
        >
          {customer.isActive ? 'Active' : 'Inactive'}
        </Badge>
        
        <div className="flex gap-1">
          <Link href={`/admin/customers/${customer.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/customers/${customer.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-green-50">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
});

CustomerRow.displayName = 'CustomerRow';

const VirtualizedCustomerTable = memo(function VirtualizedCustomerTable({ customers }: VirtualizedCustomerTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const customerCount = useMemo(() => customers.length, [customers.length]);

  // Calculate which items to render based on scroll position
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT),
      customerCount
    );
    
    return {
      start: Math.max(0, visibleStart - BUFFER_SIZE),
      end: Math.min(customerCount, visibleEnd + BUFFER_SIZE)
    };
  }, [scrollTop, customerCount]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return customers.slice(visibleRange.start, visibleRange.end);
  }, [customers, visibleRange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (!customerCount) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Customers (0)
          </CardTitle>
          <CardDescription>
            Manage customer relationships and business data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500 mb-6">
              Get started by adding your first customer.
            </p>
            <Link href="/admin/customers/new">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Customers ({customerCount})
        </CardTitle>
        <CardDescription>
          Manage customer relationships and business data
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center">
            <div className="w-[30%] font-semibold text-gray-700">Company</div>
            <div className="w-[20%] font-semibold text-gray-700 px-2">Location</div>
            <div className="w-[25%] font-semibold text-gray-700 px-2">Contact</div>
            <div className="w-[15%] font-semibold text-gray-700 text-center">Assets/Tickets</div>
            <div className="w-[10%] font-semibold text-gray-700 text-right">Status/Actions</div>
          </div>
        </div>

        {/* Virtual Scrolling Container */}
        <div 
          ref={containerRef}
          className="overflow-auto"
          style={{ height: CONTAINER_HEIGHT }}
          onScroll={handleScroll}
        >
          {/* Total height spacer */}
          <div style={{ height: customerCount * ITEM_HEIGHT, position: 'relative' }}>
            {/* Visible items */}
            {visibleItems.map((customer, index) => {
              const actualIndex = visibleRange.start + index;
              return (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  style={{
                    position: 'absolute',
                    top: actualIndex * ITEM_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                  }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

VirtualizedCustomerTable.displayName = 'VirtualizedCustomerTable';

export default VirtualizedCustomerTable;
