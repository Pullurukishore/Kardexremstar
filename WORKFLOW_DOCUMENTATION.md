# KardexCare Ticket Management Workflow Documentation

## Overview
This document provides comprehensive documentation for the KardexCare ticket management system, including workflow states, role-based access control, and API endpoints.

## User Roles

### ADMIN
- Full access to all system features
- Can approve PO requests
- Can manage all tickets across all zones
- Can create and manage users, assets, and service zones

### ZONE_USER (Customer Representative)
- Can create tickets for their assigned zone
- Can view and manage tickets within their zone
- Can close tickets after resolution
- Can provide feedback and ratings

### SERVICE_PERSON
- Can view and update tickets assigned to them
- Can perform onsite visits
- Can update ticket status and add technical notes
- Can request spare parts and PO approvals

## Ticket Status Workflow

### Status Flow
```
OPEN → ASSIGNED → IN_PROCESS → ONSITE_VISIT_PLANNED → ONSITE_VISIT → 
[RESOLVED | SPARE_PARTS_NEEDED | PO_NEEDED] → CLOSED
```

### Status Descriptions

1. **OPEN**: Initial state when ticket is created
2. **ASSIGNED**: Ticket assigned to a service person
3. **IN_PROCESS**: Service person has started working on the ticket
4. **ONSITE_VISIT_PLANNED**: Onsite visit has been scheduled
5. **ONSITE_VISIT**: Service person is conducting onsite visit
6. **RESOLVED**: Issue has been resolved
7. **SPARE_PARTS_NEEDED**: Spare parts are required
8. **SPARE_PARTS_BOOKED**: Spare parts have been ordered
9. **SPARE_PARTS_DELIVERED**: Spare parts have been delivered
10. **PO_NEEDED**: Purchase order is required
11. **PO_RECEIVED**: Purchase order has been approved
12. **CLOSED**: Ticket is closed (final state)

## API Endpoints

### Ticket Management

#### GET /api/tickets
- **Description**: Get all tickets with filtering and pagination
- **Access**: All authenticated users (filtered by role)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `status`: Filter by ticket status
  - `priority`: Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)
  - `assignedToId`: Filter by assigned user
  - `customerId`: Filter by customer
  - `zoneId`: Filter by service zone

#### POST /api/tickets
- **Description**: Create a new ticket
- **Access**: ADMIN, ZONE_USER
- **Required Fields**:
  - `title`: Ticket title
  - `description`: Detailed description
  - `priority`: Priority level
  - `contactId`: Customer contact ID
  - `zoneId`: Service zone ID
- **Optional Fields**:
  - `assetId`: Related asset ID
  - `customerId`: Customer ID (auto-assigned for ZONE_USER)
  - `errorDetails`: Technical error details
  - `proofImages`: Array of image URLs
  - `relatedMachineIds`: Array of related machine IDs

#### PUT /api/tickets/:id/status
- **Description**: Update ticket status
- **Access**: Role-based (see workflow validation)
- **Required Fields**:
  - `status`: New status
- **Optional Fields**:
  - `notes`: Status change notes

#### POST /api/tickets/:id/assign
- **Description**: Assign ticket to service person
- **Access**: ADMIN, ZONE_USER
- **Required Fields**:
  - `assignedToId`: Service person ID

#### POST /api/tickets/:id/assign-zone-user
- **Description**: Assign ticket to zone user
- **Access**: ADMIN, SERVICE_PERSON
- **Required Fields**:
  - `zoneUserId`: Zone user ID

#### POST /api/tickets/:id/plan-onsite-visit
- **Description**: Plan onsite visit
- **Access**: ADMIN, ZONE_USER, SERVICE_PERSON
- **Required Fields**:
  - `servicePersonId`: Service person ID
  - `visitDate`: Visit date and time
- **Optional Fields**:
  - `notes`: Visit planning notes

#### POST /api/tickets/:id/complete-onsite-visit
- **Description**: Complete onsite visit
- **Access**: SERVICE_PERSON (assigned to ticket)
- **Required Fields**:
  - `resolutionSummary`: Summary of work performed
  - `isResolved`: Boolean indicating if issue is resolved
- **Optional Fields**:
  - `sparePartsNeeded`: Boolean for spare parts requirement
  - `sparePartsDetails`: Details of required spare parts

#### POST /api/tickets/:id/request-po
- **Description**: Request purchase order
- **Access**: SERVICE_PERSON (assigned to ticket)
- **Required Fields**:
  - `description`: PO description
- **Optional Fields**:
  - `amount`: PO amount
  - `notes`: Additional notes

#### POST /api/tickets/:id/approve-po
- **Description**: Approve purchase order
- **Access**: ADMIN only
- **Required Fields**:
  - `poNumber`: Purchase order number
- **Optional Fields**:
  - `notes`: Approval notes

#### POST /api/tickets/:id/update-spare-parts
- **Description**: Update spare parts status
- **Access**: SERVICE_PERSON, ADMIN
- **Required Fields**:
  - `status`: BOOKED or DELIVERED
- **Optional Fields**:
  - `details`: Spare parts details

#### POST /api/tickets/:id/close
- **Description**: Close ticket
- **Access**: ZONE_USER (for their zone), ADMIN
- **Optional Fields**:
  - `feedback`: Customer feedback
  - `rating`: Rating (1-5)

#### POST /api/tickets/:id/notes
- **Description**: Add internal note to ticket
- **Access**: All authenticated users
- **Required Fields**:
  - `content`: Note content

#### POST /api/tickets/:id/comments
- **Description**: Add comment to ticket
- **Access**: All authenticated users
- **Required Fields**:
  - `content`: Comment content
- **Optional Fields**:
  - `isInternal`: Boolean for internal comments

### Notification System

#### GET /api/notifications
- **Description**: Get user notifications
- **Access**: All authenticated users
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by status (UNREAD, READ, ARCHIVED)

#### GET /api/notifications/unread-count
- **Description**: Get unread notifications count
- **Access**: All authenticated users

#### POST /api/notifications/:id/read
- **Description**: Mark single notification as read
- **Access**: All authenticated users

#### POST /api/notifications/read
- **Description**: Mark multiple notifications as read
- **Access**: All authenticated users
- **Required Fields**:
  - `notificationIds`: Array of notification IDs

## Workflow Validation Rules

### Status Transition Rules
- **OPEN** → ASSIGNED, IN_PROCESS
- **ASSIGNED** → IN_PROCESS, ONSITE_VISIT_PLANNED
- **IN_PROCESS** → ONSITE_VISIT_PLANNED, RESOLVED, SPARE_PARTS_NEEDED, PO_NEEDED
- **ONSITE_VISIT_PLANNED** → ONSITE_VISIT
- **ONSITE_VISIT** → RESOLVED, SPARE_PARTS_NEEDED, PO_NEEDED
- **RESOLVED** → CLOSED
- **SPARE_PARTS_NEEDED** → SPARE_PARTS_BOOKED
- **SPARE_PARTS_BOOKED** → SPARE_PARTS_DELIVERED
- **SPARE_PARTS_DELIVERED** → RESOLVED
- **PO_NEEDED** → PO_RECEIVED
- **PO_RECEIVED** → RESOLVED

### Role-Based Status Change Permissions
- **ADMIN**: Can change to any status
- **SERVICE_PERSON**: Can change to IN_PROCESS, ONSITE_VISIT, RESOLVED, SPARE_PARTS_NEEDED, SPARE_PARTS_BOOKED, SPARE_PARTS_DELIVERED, PO_NEEDED
- **ZONE_USER**: Can change to ASSIGNED, ONSITE_VISIT_PLANNED, CLOSED

### Business Logic Validations
1. **Assignment Validation**: Users must have correct roles and be active
2. **PO Operations**: Only allowed for tickets in specific statuses
3. **Spare Parts Operations**: Only allowed for tickets with spare parts statuses
4. **Onsite Visit Planning**: Requires valid service person assignment
5. **Ticket Closure**: Only zone users can close tickets in their zone

## Notification Types

### Automatic Notifications
1. **Ticket Assignment**: Sent to assigned user
2. **Status Changes**: Sent to relevant stakeholders
3. **PO Requests**: Sent to admins for approval
4. **PO Approvals/Rejections**: Sent to requester
5. **Onsite Visit Planning**: Sent to assigned service person
6. **Spare Parts Updates**: Sent to ticket stakeholders

### Notification Recipients
- **Ticket Owner**: Original creator
- **Assigned User**: Currently assigned service person
- **Sub Owner**: Zone user handling the ticket
- **Customer Users**: For customer-facing status changes
- **Admins**: For PO requests and system alerts

## Security Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Role-based access control (RBAC)
- Token versioning for security
- Secure cookie settings

### Data Protection
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- Audit logging for all critical operations
- Request rate limiting (recommended)

## Error Handling

### Common Error Responses
- **400 Bad Request**: Invalid input data or business logic violation
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

### Validation Errors
All endpoints include comprehensive input validation with descriptive error messages for:
- Required field validation
- Data type validation
- Business rule validation
- Permission validation

## Database Schema Considerations

### Key Models
- **User**: System users with roles
- **Customer**: Customer organizations
- **ServiceZone**: Geographic service areas
- **Asset**: Customer assets/machines
- **Ticket**: Support tickets
- **TicketStatusHistory**: Status change audit trail
- **AuditLog**: System audit trail
- **Notification**: User notifications
- **PORequest**: Purchase order requests

### Relationships
- Users belong to customers and service zones
- Tickets belong to customers, zones, and assets
- Tickets have owners, assignees, and sub-owners
- Status history tracks all ticket changes
- Audit logs track all system operations

## Performance Considerations

### Database Optimization
- Indexed fields for common queries
- Pagination for large result sets
- Efficient joins and includes
- Query optimization for role-based filtering

### Caching Strategies
- Consider implementing Redis for:
  - Session management
  - Notification caching
  - Frequently accessed data

## Deployment & Monitoring

### Environment Variables
- Database connection strings
- JWT secrets
- API rate limits
- Notification service configurations

### Monitoring Recommendations
- API response times
- Database query performance
- Error rates and types
- User activity patterns
- Notification delivery rates

## Future Enhancements

### Potential Features
1. **Real-time Updates**: WebSocket integration for live updates
2. **File Attachments**: Support for ticket attachments
3. **SLA Management**: Service level agreement tracking
4. **Reporting Dashboard**: Analytics and reporting features
5. **Mobile API**: Mobile-optimized endpoints
6. **Integration APIs**: Third-party system integrations

### Scalability Considerations
- Microservices architecture
- Event-driven notifications
- Horizontal database scaling
- CDN for file attachments
- Load balancing for high availability

---

This documentation provides a comprehensive guide to the KardexCare ticket management workflow system. For technical implementation details, refer to the source code and inline comments.
