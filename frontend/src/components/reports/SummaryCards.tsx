// Server-side component

import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  summary: Record<string, any>;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  if (!summary || Object.keys(summary).length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(summary)
        // Only render primitive values (number, string, boolean). Skip objects/arrays like mostActiveUser
        .filter(([, value]) => ['number', 'string', 'boolean'].includes(typeof value))
        .map(([key, value]: [string, any]) => {
          const displayValue = typeof value === 'number'
            ? value.toLocaleString()
            : typeof value === 'boolean'
              ? (value ? 'Yes' : 'No')
              : String(value);

          return (
            <Card key={key} className="bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all duration-200 card-mobile touch-manipulation">
              <CardContent className="p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {displayValue}
                </div>
                <div className="text-sm text-muted-foreground capitalize leading-tight">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}

