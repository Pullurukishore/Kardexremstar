# Activity Scheduling API Documentation

## Base URL
```
/api/activity-schedule
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Create Activity Schedule
**POST** `/`

Create a new activity schedule for a service person.

**Request Body:**
```json
{
  "servicePersonId": 123,
  "title": "Customer Visit",
  "description": "Routine maintenance visit",
  "activityType": "TICKET_WORK",
  "priority": "HIGH",
  "scheduledDate": "2025-12-20T10:00:00Z",
  "estimatedDuration": 120,
  "location": "Customer Office, Bangalore",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "ticketId": 456,
  "zoneId": "zone-1",
  "notes": "Bring spare parts"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Activity schedule created successfully",
  "data": {
    "id": 1,
    "servicePersonId": 123,
    "scheduledById": 1,
    "title": "Customer Visit",
    "description": "Routine maintenance visit",
    "activityType": "TICKET_WORK",
    "priority": "HIGH",
    "scheduledDate": "2025-12-20T10:00:00Z",
    "estimatedDuration": 120,
    "location": "Customer Office, Bangalore",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "status": "PENDING",
    "acceptedAt": null,
    "rejectedAt": null,
    "completedAt": null,
    "ticketId": 456,
    "zoneId": "zone-1",
    "notes": "Bring spare parts",
    "createdAt": "2025-12-19T15:30:00Z",
    "updatedAt": "2025-12-19T15:30:00Z",
    "servicePerson": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91 9876543210"
    },
    "scheduledBy": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "ticket": {
      "id": 456,
      "title": "Machine Repair",
      "status": "ASSIGNED"
    }
  }
}
```

---

### 2. Get Activity Schedules (List)
**GET** `/`

Retrieve all activity schedules with optional filters.

**Query Parameters:**
- `servicePersonId` (optional): Filter by service person ID
- `status` (optional): Filter by status (PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `fromDate` (optional): Start date (ISO 8601 format)
- `toDate` (optional): End date (ISO 8601 format)
- `zoneId` (optional): Filter by zone ID
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 20): Items per page

**Example Request:**
```
GET /api/activity-schedule?status=PENDING&priority=HIGH&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "servicePersonId": 123,
      "title": "Customer Visit",
      "activityType": "TICKET_WORK",
      "priority": "HIGH",
      "scheduledDate": "2025-12-20T10:00:00Z",
      "estimatedDuration": 120,
      "status": "PENDING",
      "zoneId": "zone-1",
      "servicePerson": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91 9876543210"
      },
      "scheduledBy": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "ticket": {
        "id": 456,
        "title": "Machine Repair",
        "status": "ASSIGNED"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 3. Get Schedule Details
**GET** `/:id`

Retrieve detailed information about a specific activity schedule.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "servicePersonId": 123,
    "title": "Customer Visit",
    "description": "Routine maintenance visit",
    "activityType": "TICKET_WORK",
    "priority": "HIGH",
    "scheduledDate": "2025-12-20T10:00:00Z",
    "estimatedDuration": 120,
    "location": "Customer Office, Bangalore",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "status": "PENDING",
    "acceptedAt": null,
    "rejectedAt": null,
    "completedAt": null,
    "ticketId": 456,
    "zoneId": "zone-1",
    "notes": "Bring spare parts",
    "createdAt": "2025-12-19T15:30:00Z",
    "updatedAt": "2025-12-19T15:30:00Z",
    "servicePerson": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91 9876543210",
      "serviceZones": [
        {
          "serviceZone": {
            "id": "zone-1",
            "name": "Bangalore Zone"
          }
        }
      ]
    },
    "scheduledBy": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "ticket": {
      "id": 456,
      "title": "Machine Repair",
      "status": "ASSIGNED",
      "customer": {
        "id": 789,
        "companyName": "ABC Corp"
      }
    }
  }
}
```

---

### 4. Update Activity Schedule
**PATCH** `/:id`

Update an activity schedule (only if status is PENDING).

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "URGENT",
  "scheduledDate": "2025-12-21T10:00:00Z",
  "estimatedDuration": 150,
  "location": "New Location",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Activity schedule updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Title",
    "priority": "URGENT",
    "scheduledDate": "2025-12-21T10:00:00Z",
    "estimatedDuration": 150,
    "status": "PENDING",
    "updatedAt": "2025-12-19T16:00:00Z"
  }
}
```

---

### 5. Accept Schedule (Service Person)
**PATCH** `/:id/accept`

Service person accepts a scheduled activity.

**Response (200):**
```json
{
  "success": true,
  "message": "Activity schedule accepted",
  "data": {
    "id": 1,
    "status": "ACCEPTED",
    "acceptedAt": "2025-12-19T16:30:00Z"
  }
}
```

---

### 6. Reject Schedule (Service Person)
**PATCH** `/:id/reject`

Service person rejects a scheduled activity with a reason.

**Request Body:**
```json
{
  "rejectionReason": "Already have another appointment at that time"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Activity schedule rejected",
  "data": {
    "id": 1,
    "status": "REJECTED",
    "rejectedAt": "2025-12-19T16:30:00Z",
    "rejectionReason": "Already have another appointment at that time"
  }
}
```

---

### 7. Complete Schedule
**PATCH** `/:id/complete`

Mark a schedule as completed (only if status is ACCEPTED).

**Response (200):**
```json
{
  "success": true,
  "message": "Activity schedule completed",
  "data": {
    "id": 1,
    "status": "COMPLETED",
    "completedAt": "2025-12-20T12:00:00Z"
  }
}
```

---

### 8. Cancel Schedule
**PATCH** `/:id/cancel`

Cancel a schedule (only if status is PENDING).

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Activity schedule cancelled",
  "data": {
    "id": 1,
    "status": "CANCELLED",
    "notes": "Cancelled: Customer requested cancellation"
  }
}
```

---

### 9. Get Service Person Availability
**GET** `/availability/:servicePersonId`

Get available time slots for a service person.

**Query Parameters:**
- `fromDate` (required): Start date (ISO 8601 format)
- `toDate` (required): End date (ISO 8601 format)

**Example Request:**
```
GET /api/activity-schedule/availability/123?fromDate=2025-12-20T00:00:00Z&toDate=2025-12-31T23:59:59Z
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      {
        "start": "2025-12-20T09:00:00Z",
        "end": "2025-12-20T10:00:00Z",
        "duration": 60
      },
      {
        "start": "2025-12-20T10:00:00Z",
        "end": "2025-12-20T11:00:00Z",
        "duration": 60
      }
    ],
    "busySlots": [
      {
        "scheduleId": 1,
        "start": "2025-12-20T14:00:00Z",
        "end": "2025-12-20T15:30:00Z",
        "title": "Customer Visit",
        "activityType": "TICKET_WORK",
        "duration": 90
      }
    ],
    "suggestedTimes": [
      {
        "start": "2025-12-20T09:00:00Z",
        "end": "2025-12-20T10:00:00Z",
        "duration": 60
      },
      {
        "start": "2025-12-20T10:00:00Z",
        "end": "2025-12-20T11:00:00Z",
        "duration": 60
      },
      {
        "start": "2025-12-20T11:00:00Z",
        "end": "2025-12-20T12:00:00Z",
        "duration": 60
      }
    ],
    "totalAvailableSlots": 45,
    "totalBusySlots": 3
  }
}
```

---

### 10. Suggest Optimal Schedule
**POST** `/suggest`

Get optimal schedule suggestions based on service person availability.

**Request Body:**
```json
{
  "servicePersonIds": [123, 124, 125],
  "activityType": "TICKET_WORK",
  "estimatedDuration": 120,
  "priority": "HIGH",
  "fromDate": "2025-12-20T00:00:00Z",
  "toDate": "2025-12-31T23:59:59Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "servicePersonId": 123,
        "servicePerson": {
          "id": 123,
          "name": "John Doe",
          "email": "john@example.com"
        },
        "suggestedDate": "2025-12-20T09:00:00Z",
        "reason": "Available slot found. 45 total slots available in the period.",
        "availableSlotsCount": 45
      },
      {
        "servicePersonId": 124,
        "servicePerson": {
          "id": 124,
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "suggestedDate": "2025-12-20T10:00:00Z",
        "reason": "Available slot found. 42 total slots available in the period.",
        "availableSlotsCount": 42
      }
    ],
    "totalSuggestions": 2
  }
}
```

---

## Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict (e.g., time slot not available)
- **500**: Internal Server Error

## Status Values

- **PENDING**: Schedule created, awaiting service person response
- **ACCEPTED**: Service person accepted the schedule
- **REJECTED**: Service person rejected the schedule
- **COMPLETED**: Schedule completed successfully
- **CANCELLED**: Schedule cancelled

## Priority Levels

- **LOW**: Low priority
- **MEDIUM**: Medium priority (default)
- **HIGH**: High priority
- **URGENT**: Urgent priority

## Activity Types

- TICKET_WORK
- BD_VISIT
- PO_DISCUSSION
- SPARE_REPLACEMENT
- TRAVEL
- TRAINING
- MEETING
- MAINTENANCE
- DOCUMENTATION
- OTHER
- WORK_FROM_HOME
- INSTALLATION
- MAINTENANCE_PLANNED
- REVIEW_MEETING
- RELOCATION

## Working Hours

- **Start**: 9:00 AM
- **End**: 5:30 PM
- **Working Days**: Monday to Saturday (Sundays excluded)

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Missing required fields: servicePersonId, title, activityType, scheduledDate"
}
```

### Conflict Error
```json
{
  "success": false,
  "message": "Time slot not available for this service person"
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Activity schedule not found"
}
```

### Permission Error
```json
{
  "success": false,
  "message": "You can only accept your own schedules"
}
```

## Zone Filtering

- **ADMIN**: Can see all schedules across all zones
- **ZONE_MANAGER**: Can see schedules only for their assigned zones
- **ZONE_USER**: Can see schedules only for their assigned zones
- **SERVICE_PERSON**: Can see only their own schedules

## Notes

- All dates should be in ISO 8601 format (UTC)
- Coordinates (latitude/longitude) should be decimal degrees
- Duration is in minutes
- Only PENDING schedules can be edited or cancelled
- Only ACCEPTED schedules can be marked as completed
- Service persons can only accept/reject their own schedules
