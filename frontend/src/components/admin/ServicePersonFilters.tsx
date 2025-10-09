import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServicePersonFiltersProps {
  searchParams: {
    search?: string;
    page?: string;
  };
}

export function ServicePersonFilters({ searchParams }: ServicePersonFiltersProps) {
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
                placeholder="Search by email or ID..."
                defaultValue={currentSearch}
                className="pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
