# Sidebar Color Scheme Documentation

## Enhanced Sidebar Design

The sidebar has been upgraded with a modern, color-coded icon system for better visual hierarchy and user experience.

### Color Palette by Page Type

| Page Name | Icon | Color | Background | Purpose |
|-----------|------|-------|------------|---------|
| **Dashboard** | LayoutDashboard | Blue (`text-blue-600`) | `bg-blue-50` | Primary navigation hub |
| **Daily Activity** | Calendar | Emerald (`text-emerald-600`) | `bg-emerald-50` | Time-based activities |
| **Customers** | Users | Purple (`text-purple-600`) | `bg-purple-50` | Customer management |
| **Service Persons** | Activity | Orange (`text-orange-600`) | `bg-orange-50` | Service personnel |
| **Service Zones** | MapPin | Rose (`text-rose-600`) | `bg-rose-50` | Location-based features |
| **Zone Users** | Users | Indigo (`text-indigo-600`) | `bg-indigo-50` | Zone user management |
| **Tickets** | Ticket | Cyan (`text-cyan-600`) | `bg-cyan-50` | Ticket management |
| **Reports** | BarChart2 | Amber (`text-amber-600`) | `bg-amber-50` | Analytics & reporting |
| **Logout** | LogOut | Red (`text-red-600`) | `bg-red-50` | Exit action |

### Design Features

#### 1. **Icon Containers**
- Each icon is wrapped in a rounded container with matching background color
- Hover effects: scale animation + shadow enhancement
- Active state: white background with gradient overlay

#### 2. **Color Psychology**
- **Blue**: Trust, stability (Dashboard)
- **Emerald**: Growth, activity (Daily Activity)
- **Purple**: Creativity, users (Customers)
- **Orange**: Energy, action (Service Persons)
- **Rose**: Location, zones (Service Zones)
- **Indigo**: Authority, management (Zone Users)
- **Cyan**: Communication, tickets (Tickets)
- **Amber**: Insights, data (Reports)
- **Red**: Warning, exit (Logout)

#### 3. **Interaction States**

**Default State:**
- Colored icon in matching light background
- Subtle shadow

**Hover State:**
- Icon scales up (110%)
- Container scales up (105%)
- Enhanced shadow
- Smooth transitions

**Active State:**
- Full gradient background (blue → indigo → purple)
- White icon on gradient
- Prominent shadow with blue glow
- White indicator bar on left edge

### Accessibility

- High contrast ratios maintained
- Color is not the only indicator (icons + text)
- Focus states with ring indicators
- Semantic HTML with proper ARIA labels
- Reduced motion support

### Responsive Design

**Mobile (< 1024px):**
- Larger touch targets (56px min height)
- Icon containers: 40px × 40px
- Icons: 20px × 20px

**Desktop:**
- Compact layout
- Icon containers: 36px × 36px
- Icons: 16px × 16px

### Implementation Notes

1. Icons use Lucide React library for consistency
2. Colors use Tailwind CSS utility classes
3. Animations powered by Framer Motion
4. All transitions are 200ms for snappy feel
5. Gradient overlays on hover for depth
