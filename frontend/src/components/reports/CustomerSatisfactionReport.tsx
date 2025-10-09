// Server-side component - charts replaced with static summaries

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportData } from './types';

interface CustomerSatisfactionReportProps {
  reportData: ReportData;
}

export function CustomerSatisfactionReport({ reportData }: CustomerSatisfactionReportProps) {
  const { ratingDistribution, summary } = reportData;
  
  if (!ratingDistribution && !summary) {
    return (
      <Card className="card-mobile">
        <CardHeader>
          <CardTitle>Customer Satisfaction Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No customer satisfaction data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  const totalRatings = Object.values(ratingDistribution || {}).reduce((sum: number, count: number) => sum + count, 0);
  const averageRating = summary?.averageRating?.toFixed(1) || '0.0';
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Rating Distribution */}
      <Card className="card-mobile">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Customer Satisfaction Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="text-center mb-4">
            <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">{averageRating}</div>
            <div className="flex justify-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-lg sm:text-xl">
                  {i < Math.floor(parseFloat(averageRating)) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Average Rating</div>
          </div>
          
          {Object.entries(ratingDistribution || {}).map(([rating, count]) => {
            const percentage = totalRatings > 0 ? ((count / totalRatings) * 100).toFixed(1) : '0.0';
            return (
              <div key={rating} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex text-amber-400 flex-shrink-0">
                    {Array.from({ length: parseInt(rating) }, (_, i) => (
                      <span key={i} className="text-sm sm:text-base">★</span>
                    ))}
                  </div>
                  <span className="font-medium text-sm sm:text-base">{rating} Star{parseInt(rating) > 1 ? 's' : ''}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm sm:text-base">{count}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{percentage}%</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="card-mobile">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Satisfaction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{totalRatings}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Total Ratings</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{averageRating}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Average Rating</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {totalRatings > 0 ? Math.round((Object.entries(ratingDistribution || {}).filter(([rating]) => parseInt(rating) >= 4).reduce((sum, [_, count]) => sum + count, 0) / totalRatings) * 100) : 0}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Satisfied (4+ stars)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
