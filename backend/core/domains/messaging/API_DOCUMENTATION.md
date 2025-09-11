# Messaging API Documentation

## Overview

The messaging domain provides a comprehensive real-time messaging system with both REST API endpoints and WebSocket connections. The system supports thread-based conversations, file attachments, typing indicators, read receipts, and role-based access control.

## Architecture Components

### 1. Models
- **MessageThread**: Core conversation entity
- **ThreadParticipant**: Users participating in threads
- **Message**: Individual messages within threads
- **MessageAttachment**: File attachments for messages
- **MessageReadReceipt**: Track message read status
- **TypingIndicator**: Real-time typing status

### 2. REST API Endpoints

#### Message Threads (`/api/messaging/threads/`)

**List Threads**
```
GET /api/messaging/threads/
Query Parameters:
- status: active|waiting|resolved
- priority: low|normal|high|urgent
- assigned_admin: <admin_id>
- unassigned: true|false (admin only)
- assigned_to_me: true|false (admin only)
- search: <search_term>
- page: <page_number>
- page_size: <items_per_page>
```

**Create Thread**
```
POST /api/messaging/threads/
Body: {
  "client": <client_id>,
  "event": <event_id> (optional),
  "priority": "normal|high|urgent",
  "subject": "<subject>"
}
```

**Thread Detail**
```
GET /api/messaging/threads/<thread_id>/
```

**Update Thread**
```
PUT/PATCH /api/messaging/threads/<thread_id>/
Body: {
  "assigned_admin": <admin_id>,
  "priority": "low|normal|high|urgent",
  "status": "active|waiting|resolved",
  "subject": "<subject>"
}
```

**Thread Actions**
```
POST /api/messaging/threads/<thread_id>/assign_admin/
Body: { "admin_id": <admin_id> }

POST /api/messaging/threads/<thread_id>/mark_urgent/

POST /api/messaging/threads/<thread_id>/resolve/

POST /api/messaging/threads/<thread_id>/reopen/
```

**Thread Statistics (Admin Only)**
```
GET /api/messaging/threads/stats/
Response: {
  "total": <count>,
  "active": <count>,
  "waiting": <count>,
  "resolved": <count>,
  "urgent": <count>,
  "unassigned": <count>,
  "assigned_to_me": <count>
}
```

#### Messages (`/api/messaging/messages/`)

**List Messages**
```
GET /api/messaging/messages/
Query Parameters:
- thread: <thread_id>
- sender: <sender_id>
- page: <page_number>
- page_size: <items_per_page>
```

**Send Message**
```
POST /api/messaging/messages/
Body: {
  "thread": <thread_id>,
  "content": "<message_content>",
  "message_type": "text|system|file|event_update",
  "is_internal_note": false (admin only),
  "parent_message": <message_id> (optional),
  "attachments": [<file1>, <file2>] (optional)
}
```

**Message Detail**
```
GET /api/messaging/messages/<message_id>/
```

**Edit Message**
```
PUT/PATCH /api/messaging/messages/<message_id>/
Body: { "content": "<new_content>" }
Note: Only sender can edit within 15 minutes
```

**Delete Message**
```
DELETE /api/messaging/messages/<message_id>/
Note: Sender can delete within 1 hour, admins can always delete
```

**Mark Message Read**
```
POST /api/messaging/messages/<message_id>/mark_read/
```

**Mark Thread Read**
```
POST /api/messaging/messages/mark_thread_read/
Body: { "thread_id": <thread_id> }
```

#### Attachments (`/api/messaging/attachments/`)

**List Attachments**
```
GET /api/messaging/attachments/
```

**Attachment Detail**
```
GET /api/messaging/attachments/<attachment_id>/
```

**Download Attachment**
```
GET /api/messaging/attachments/<attachment_id>/download/
```

#### File Uploads (`/api/messaging/uploads/`)

**Upload File**
```
POST /api/messaging/uploads/
Content-Type: multipart/form-data
Body: { "file": <file> }
```

#### Typing Indicators (`/api/messaging/typing/`)

**Update Typing Status**
```
POST /api/messaging/typing/update_typing/
Body: {
  "thread_id": <thread_id>,
  "is_typing": true|false
}
```

### 3. WebSocket Connections

#### Thread Messaging
```
ws://localhost:8000/ws/messaging/thread/<thread_id>/
```

**Supported Messages:**
- `ping`: Connection test
- `send_message`: Send new message
- `mark_read`: Mark messages as read
- `typing`: Update typing status
- `edit_message`: Edit existing message
- `delete_message`: Delete message

**Example Send Message:**
```json
{
  "type": "send_message",
  "content": "Hello world!",
  "message_type": "text",
  "is_internal_note": false
}
```

**Example Typing Indicator:**
```json
{
  "type": "typing",
  "is_typing": true
}
```

#### User Messaging (Personal Notifications)
```
ws://localhost:8000/ws/messaging/user/
```

**Supported Messages:**
- `ping`: Connection test
- `get_notifications`: Get pending notifications
- `mark_notification_read`: Mark notification as read

#### General Messaging (System Broadcasts)
```
ws://localhost:8000/ws/messaging/general/
```

**Supported Messages:**
- `ping`: Connection test
- `broadcast`: Send system-wide message (admin only)

### 4. WebSocket Events

**Incoming Events (Server → Client):**

**New Message:**
```json
{
  "type": "new_message",
  "message": {
    "id": "<message_id>",
    "thread_id": "<thread_id>",
    "sender_id": <sender_id>,
    "sender_name": "<sender_name>",
    "content": "<content>",
    "message_type": "text",
    "is_internal_note": false,
    "created_at": "2024-01-01T12:00:00Z",
    "attachments": [...]
  }
}
```

**Message Edited:**
```json
{
  "type": "message_edited",
  "message": {
    "id": "<message_id>",
    "content": "<new_content>",
    "edited_at": "2024-01-01T12:05:00Z"
  }
}
```

**Message Deleted:**
```json
{
  "type": "message_deleted",
  "message_id": "<message_id>"
}
```

**Message Read:**
```json
{
  "type": "message_read",
  "message_id": "<message_id>",
  "user_id": <user_id>,
  "user_name": "<user_name>",
  "read_at": "2024-01-01T12:00:00Z"
}
```

**Typing Indicator:**
```json
{
  "type": "typing_indicator",
  "user_id": <user_id>,
  "user_name": "<user_name>",
  "is_typing": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**User Presence:**
```json
{
  "type": "user_presence",
  "user_id": <user_id>,
  "user_name": "<user_name>",
  "status": "joined|left",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Thread Status Change:**
```json
{
  "type": "thread_status_changed",
  "thread_id": "<thread_id>",
  "old_status": "active",
  "new_status": "resolved",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

**Thread Assignment:**
```json
{
  "type": "thread_assigned",
  "thread_id": "<thread_id>",
  "old_admin_id": <admin_id>,
  "new_admin_id": <admin_id>,
  "new_admin_name": "<admin_name>",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### 5. Permissions

#### Client Users
- Can only access their own threads
- Cannot see internal admin notes
- Can create messages in their threads
- Can mark messages as read
- Can mark threads as urgent
- Can reopen resolved threads

#### Admin Users
- Can access all threads
- Can see and create internal notes
- Can assign threads to admins
- Can change thread status and priority
- Can edit/delete any message
- Can send system broadcasts

### 6. Data Models

#### MessageThread
```json
{
  "id": "<uuid>",
  "client": {<user_object>},
  "event": {<event_object>} | null,
  "assigned_admin": {<user_object>} | null,
  "priority": "low|normal|high|urgent",
  "status": "active|waiting|resolved",
  "subject": "<subject>",
  "last_message_at": "2024-01-01T12:00:00Z",
  "last_message_content": "<preview>",
  "last_message_sender_name": "<name>",
  "unread_count": <count>,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

#### Message
```json
{
  "id": "<uuid>",
  "thread": "<thread_id>",
  "sender": {<user_object>},
  "content": "<content>",
  "message_type": "text|system|file|event_update",
  "is_internal_note": false,
  "edited_at": "2024-01-01T12:05:00Z" | null,
  "original_content": "<original>" | "",
  "parent_message": "<message_id>" | null,
  "attachments": [...],
  "is_read_by_user": true,
  "can_edit": false,
  "can_delete": false,
  "time_ago": "5 minutes ago",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

#### MessageAttachment
```json
{
  "id": "<uuid>",
  "filename": "<filename>",
  "file_url": "<url>",
  "file_size": <bytes>,
  "file_size_formatted": "1.2 MB",
  "file_type": "<mime_type>",
  "uploaded_by": <user_id>,
  "created_at": "2024-01-01T12:00:00Z"
}
```

### 7. Error Handling

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

**WebSocket Error Format:**
```json
{
  "type": "error",
  "message": "<error_description>"
}
```

**Common Errors:**
- Invalid thread access
- Message content too long
- File type not allowed
- Edit time limit exceeded
- Permission denied

### 8. Rate Limiting

- Message sending: 10 messages per minute per user
- File uploads: 5 uploads per minute per user
- Typing indicators: 1 per second per user
- WebSocket connections: 10 concurrent per user

### 9. File Upload Constraints

**Allowed File Types:**
- Documents: pdf, doc, docx, txt, rtf
- Images: jpg, jpeg, png, gif, webp
- Videos: mp4, mov, avi, mkv
- Audio: mp3, wav, ogg
- Archives: zip, rar, 7z

**File Size Limits:**
- Maximum file size: 10MB
- Maximum files per message: 10

### 10. Performance Optimizations

- Database indexes on frequently queried fields
- Prefetch related objects in querysets
- Pagination for large datasets
- WebSocket connection pooling
- Redis caching for session data
- Automatic cleanup of stale data

### 11. Security Features

- Role-based access control
- Message encryption (optional)
- File type validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Connection authentication

This API provides a complete messaging solution with real-time capabilities, file sharing, and comprehensive administrative features suitable for a professional event management platform.