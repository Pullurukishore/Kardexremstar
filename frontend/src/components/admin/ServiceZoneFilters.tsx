import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServiceZoneFiltersProps {
  searchParams: {
    search?: string;
    page?: string;
  };
}

export function ServiceZoneFilters({ searchParams }: ServiceZoneFiltersProps) {
  const currentSearch = searchParams.search || '';

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
        <CardTitle className="text-gray-800">Search & Filter</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form method="GET" className="flex flex-col md:flex-row gap-4">
          {/* Preserve current page when searching */}
          <input type="hidden" name="page" value="1" />
          
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                name="search"
                type="search"
                placeholder="Search zones by name or description..."
                defaultValue={currentSearch}
                className="pl-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
