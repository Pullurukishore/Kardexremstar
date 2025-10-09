// Helper to format numbers with commas
export const formatNumber = (num: number | string) => {
  const number = typeof num === 'string' ? parseFloat(num) || 0 : num;
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Get status color for badges
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'waiting_customer': return 'bg-orange-100 text-orange-800';
    case 'resolved': case 'closed': return 'bg-green-100 text-green-800';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Get priority color for badges
export const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Format date for display
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format time duration
export const formatDuration = (hours: number, minutes: number) => {
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
};

// Format change percentage
export const formatChange = (change: number, isPositive: boolean) => {
  if (change === 0) return 'No change';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change}% vs last period`;
};

// Get status badge color (duplicate for compatibility)
export const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'waiting_customer': return 'bg-orange-100 text-orange-800';
    case 'resolved':
    case 'closed': return 'bg-green-100 text-green-800';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Get priority badge color (duplicate for compatibility)
export const getPriorityBadgeColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
