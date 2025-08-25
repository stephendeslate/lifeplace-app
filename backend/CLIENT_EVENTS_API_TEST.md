# Client Events API Testing Guide

## API Endpoint Fixed

The issue was that the frontend calls `/api/client/events/` but the backend was only configured for `/api/events/client/events/`.

### Fix Applied:
1. Added client-specific URL routing in `core/urls.py`:
   ```python
   path('api/client/', include('core.domains.events.urls')),
   ```

2. Enhanced error handling in `ClientEventViewSet` with proper logging
3. Verified User model has required `role` field with CLIENT/ADMIN choices
4. Verified Event model has proper `client` ForeignKey relationship

### Available Endpoints:
- `GET /api/client/events/` - List client's events
- `GET /api/client/events/{id}/` - Get event details
- `GET /api/client/events/{id}/timeline/` - Get event timeline
- `GET /api/client/events/{id}/documents/` - Get event documents
- `GET /api/client/events/{id}/notes/` - Get event notes
- `PATCH /api/client/events/{id}/update_preferences/` - Update preferences

### Required Authentication:
- User must be authenticated (JWT token)
- User must have role='CLIENT'

### Query Parameters for List:
- `status` - Filter by event status (LEAD, CONFIRMED, COMPLETED, CANCELLED)
- `upcoming_only=true` - Only show future events

### Testing Steps:
1. Ensure Django server is running: `python manage.py runserver`
2. Create a client user with role='CLIENT'
3. Obtain JWT token for authentication
4. Test the API endpoint: `GET /api/client/events/`

### Common Issues to Check:
1. Django dependencies installed (`pip install -r requirements.txt`)
2. Database migrations applied (`python manage.py migrate`)
3. User has CLIENT role assigned
4. JWT authentication token is valid
5. CORS settings allow frontend domain

The URL routing fix should resolve the 404 error you were experiencing.