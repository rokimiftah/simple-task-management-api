# Simple Task Management API

REST API untuk sistem manajemen tugas sederhana dengan fungsionalitas CRUD lengkap, autentikasi berbasis token, dan validasi request.

<div align="center">
  <h2><a href="https://eplc-test.rokimiftah.id">Link Demo (https://eplc-test.rokimiftah.id)</a></h2>
</div>

## Tech Stack

- **Runtime**: Bun 1.3.6
- **Framework**: ElysiaJS 1.4.22
- **Language**: TypeScript 5.x
- **Database**: SQLite (bun:sqlite)
- **Password Hashing**: bcrypt
- **API Documentation**: Scalar UI (@elysiajs/openapi)

## Installation

### Prerequisites

Pastikan [Bun](https://bun.sh/) sudah terinstall di sistem Anda:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install Dependencies

```bash
bun install
```

### Environment Setup

Environment variables tidak diperlukan untuk development. Server akan berjalan dengan default:

- `PORT`: 3000
- `NODE_ENV`: development (default)

Untuk production, environment variables di-set via systemd service.

## Running the Server

### Development Mode

```bash
bun run dev
```

Server akan berjalan di `http://localhost:3000` dengan hot-reload enabled.

### Production Mode

**Option 1: Run with Bun**

```bash
bun run start
```

**Option 2: Build and Run Binary (Recommended)**

```bash
# Build binary
bun run build

# Run binary (no Bun required)
./server
```

**Option 3: Cluster Mode (Multi-Core)**

```bash
# Build cluster binary
bun run build:cluster

# Run with all CPU cores
./server
```

Server akan berjalan di `http://localhost:3000` (atau PORT dari environment variable).

---

## Deployment

Untuk deployment ke production, lihat panduan lengkap di [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md).

### Quick Docker Deployment

```bash
# Build dan start dengan Docker Compose
docker-compose up -d

# Atau build manual dengan Docker
docker build -t elysia-api:latest .
docker run -d -p 3000:3000 --name elysia-api elysia-api:latest
```

### Cloud Deployment Options

- **Railway**: `railway login && railway init && railway up`
- **Render**: Connect GitHub repo, set build command `bun install && bun run build`, start command `./server`
- **Fly.io**: `flyctl launch && flyctl deploy`
- **VPS**: Lihat [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) untuk panduan deployment VPS dengan Caddy

Lihat [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) untuk detail lengkap termasuk cluster mode dan compile to binary.

### API Documentation

Scalar UI documentation tersedia di:

```
http://localhost:3000/docs
```

Dokumentasi ini menggunakan konfigurasi Scalar berikut:

- **Theme**: default
- **Layout**: modern
- **Sidebar**: hidden
- **Default Open All Tags**: true
- **Expand All Model Sections**: true
- **Expand All Responses**: true
- **Hide Client Button**: true
- **Hide Search**: true
- **Developer Tools**: localhost only
- **Toolbar**: localhost only
- **Operation Title Source**: summary
- **Persist Auth**: false
- **Telemetry**: true
- **Models**: visible
- **Document Download Type**: both
- **Dark Mode Toggle**: visible
- **Default Fonts**: enabled
- **Schema Properties Order**: alphabetical
- **Required Properties**: first

Fitur yang tersedia:

- Interactive API documentation
- Try-it-out feature untuk testing langsung
- Schema definitions untuk request/response
- Authentication setup dengan Bearer token
- Download dokumentasi (JSON/YAML)
- Dark mode support

## Database

Database SQLite akan otomatis dibuat di file `tasks.db` saat server pertama kali dijalankan. Tidak perlu setup manual.

### Schema

**Users Table:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
```

**Tasks Table:**

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  due_date DATETIME,
  tags TEXT,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Task Tags Table:**

```sql
CREATE TABLE task_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  UNIQUE(task_id, tag),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## Authentication

API menggunakan Bearer token authentication untuk proteksi endpoint.

### Token Format

```
Authorization: Bearer secret-token-123:USER_ID
```

Contoh:

```
Authorization: Bearer secret-token-123:1
```

### Error Handling

- **401 Unauthorized**: Token missing, invalid format, atau salah

## API Endpoints

### Authentication Endpoints

#### POST /auth/register

Register user baru.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "message": "Email already registered"
}
```

---

#### POST /auth/login

Login dan dapatkan token.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "token": "secret-token-123:1",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "message": "Invalid credentials"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Not Found",
  "message": "User not found"
}
```

---

### Task Endpoints

Semua endpoint task memerlukan authentication header.

#### GET /tasks

Get semua tasks milik user yang sedang login dengan advanced filtering dan sorting.

**Headers:**

```
Authorization: Bearer secret-token-123:1
```

**Query Parameters:**

| Parameter       | Type   | Default      | Description                                               |
| --------------- | ------ | ------------ | --------------------------------------------------------- |
| `page`          | number | 1            | Page number for pagination                                |
| `limit`         | number | 10           | Number of items per page (max 100)                        |
| `priority`      | string | -            | Filter by priority: `low`, `medium`, `high`               |
| `due_date_from` | string | -            | Filter tasks due after this date (ISO 8601)               |
| `due_date_to`   | string | -            | Filter tasks due before this date (ISO 8601)              |
| `tags`          | string | -            | Filter by tags (comma-separated, AND logic)               |
| `sort_by`       | string | `created_at` | Sort field: `title`, `due_date`, `priority`, `created_at` |
| `sort_order`    | string | `desc`       | Sort order: `asc`, `desc`                                 |
| `search`        | string | -            | Search in title and description (max 100 chars)           |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Task 1",
      "description": "Description 1",
      "status": "pending",
      "priority": "high",
      "due_date": "2024-12-31T23:59:59Z",
      "tags": "[\"work\", \"urgent\"]",
      "user_id": 1,
      "created_at": "2026-01-27T10:00:00.000Z",
      "updated_at": "2026-01-27T10:00:00.000Z",
      "deleted_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

#### GET /tasks/tags

Get semua unique tags untuk user yang sedang login.

**Headers:**

```
Authorization: Bearer secret-token-123:1
```

**Response (200 OK):**

```json
{
  "tags": ["work", "personal", "urgent", "project"]
}
```

---

#### GET /tasks/:id

Get task berdasarkan ID.

**Headers:**

```
Authorization: Bearer secret-token-123:1
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Task 1",
  "description": "Description 1",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "tags": "[\"work\", \"urgent\"]",
  "user_id": 1,
  "created_at": "2026-01-27T10:00:00.000Z",
  "updated_at": "2026-01-27T10:00:00.000Z",
  "deleted_at": null
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

---

#### POST /tasks

Create task baru.

**Headers:**

```
Authorization: Bearer secret-token-123:1
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "tags": ["work", "urgent"]
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-12-31T23:59:59Z",
  "tags": "[\"work\", \"urgent\"]",
  "user_id": 1,
  "created_at": "2026-01-27T11:00:00.000Z",
  "updated_at": "2026-01-27T11:00:00.000Z",
  "deleted_at": null
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "message": "Maximum 10 tags allowed per task"
}
```

**Validation Rules:**

- `title`: Required, min 1 character
- `description`: Optional
- `status`: Optional, must be 'pending' or 'done' (default: 'pending')
- `priority`: Optional, must be 'low', 'medium', or 'high' (default: 'medium')
- `due_date`: Optional, ISO 8601 datetime string
- `tags`: Optional, array of strings (max 10 tags, max 50 chars each)

---

#### PUT /tasks/:id

Update task (partial update).

**Headers:**

```
Authorization: Bearer secret-token-123:1
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Updated Title",
  "status": "done",
  "priority": "low",
  "due_date": "2025-01-01T00:00:00Z",
  "tags": ["updated"]
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Description 1",
  "status": "done",
  "priority": "low",
  "due_date": "2025-01-01T00:00:00Z",
  "tags": "[\"updated\"]",
  "user_id": 1,
  "created_at": "2026-01-27T10:00:00.000Z",
  "updated_at": "2026-01-27T12:00:00.000Z",
  "deleted_at": null
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "message": "Failed to update task"
}
```

---

#### DELETE /tasks/:id

Delete task.

**Headers:**

```
Authorization: Bearer secret-token-123:1
```

**Response (200 OK):**

```json
{
  "message": "Task deleted successfully"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

---

## Example Requests (curl)

### Authentication

**Register User:**

```bash
curl -sX POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**

```bash
curl -sX POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Save token untuk digunakan di request selanjutnya:

```bash
export TOKEN="secret-token-123:1"
```

---

### Task Operations

**Get All Tasks:**

```bash
curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"
```

**Get All Tasks with Filters:**

```bash
# Filter by priority
curl -sX GET "http://localhost:3000/tasks?priority=high" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -sX GET "http://localhost:3000/tasks?due_date_from=2024-01-01T00:00:00Z&due_date_to=2024-12-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"

# Filter by tags (AND logic - task must have all tags)
curl -sX GET "http://localhost:3000/tasks?tags=work,urgent" \
  -H "Authorization: Bearer $TOKEN"

# Search in title and description
curl -sX GET "http://localhost:3000/tasks?search=important" \
  -H "Authorization: Bearer $TOKEN"

# Sort by priority
curl -sX GET "http://localhost:3000/tasks?sort_by=priority&sort_order=asc" \
  -H "Authorization: Bearer $TOKEN"

# Combine multiple filters
curl -sX GET "http://localhost:3000/tasks?priority=high&tags=urgent&sort_by=due_date&sort_order=asc" \
  -H "Authorization: Bearer $TOKEN"
```

**Get All Unique Tags:**

```bash
curl -sX GET http://localhost:3000/tasks/tags \
  -H "Authorization: Bearer $TOKEN"
```

**Get Task by ID:**

```bash
curl -sX GET http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Create Task (Full with new fields):**

```bash
curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "status": "pending",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59Z",
    "tags": ["shopping", "urgent"]
  }'
```

**Create Task (Minimal):**

```bash
curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Simple task"}'
```

**Update Task - Multiple Fields:**

```bash
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "status": "done",
    "priority": "low",
    "tags": ["completed"]
  }'
```

**Update Task - Only Status:**

```bash
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

**Update Task - Only Description:**

```bash
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

**Update Task - Replace Tags:**

```bash
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["new-tag", "another-tag"]}'
```

**Update Task - Clear Tags:**

```bash
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags": []}'
```

**Delete Task:**

```bash
curl -sX DELETE http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Complete Workflow Example

Script lengkap dari registration sampai task management:

```bash
# 1. Register a new user
curl -sX POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "securepass123"
  }'

# 2. Login and save token
export TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepass123"
  }' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 3. Create multiple tasks
curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Complete project documentation", "status": "pending"}'

curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Review pull requests", "description": "Check all open PRs", "status": "pending"}'

curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy to production", "status": "done"}'

# 4. Get all tasks
curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"

# 5. Get a specific task
curl -sX GET http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN"

# 6. Update a task
curl -sX PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# 7. Delete a task
curl -sX DELETE http://localhost:3000/tasks/3 \
  -H "Authorization: Bearer $TOKEN"

# 8. Get all tasks again to see changes
curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"
```

---

### Testing Error Scenarios

**Test 401 Unauthorized (Missing Token):**

```bash
curl -sX GET http://localhost:3000/tasks
```

**Test 401 Unauthorized (Invalid Token):**

```bash
curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer invalid-token"
```

**Test 404 Not Found (User Not Found):**

```bash
curl -sX POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }'
```

**Test 404 Not Found (Task Not Found):**

```bash
curl -sX GET http://localhost:3000/tasks/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Test 400 Bad Request (Invalid Credentials):**

```bash
curl -sX POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrongpassword"
  }'
```

**Test 400 Bad Request (Email Already Registered):**

```bash
curl -sX POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another John",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### Tips for Testing

**Pretty Print JSON Responses dengan `jq`:**

```bash
# Install jq (jika belum terinstall)
# Ubuntu/Debian: sudo apt-get install jq
# macOS: brew install jq

# Gunakan dengan curl
curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Save Token untuk Testing:**

```bash
# Login dan save token
export TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Verify token
echo "Your token: $TOKEN"
```

**Add Newline Between Request and Response:**

**Method 1 - Gunakan `echo "" &&`:**

```bash
echo "" && curl -sX POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' | jq
```

**Method 2 - Untuk multiple requests dengan newline sebelum response:**

```bash
echo "" && curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task 1"}' | jq

echo "" && curl -sX POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task 2"}' | jq

echo "" && curl -sX GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Create Test Script:**

Simpan sebagai `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "1. Registering user..."
curl -sX POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'

echo -e "\n\n2. Logging in..."
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

echo -e "\n\n3. Creating task..."
curl -sX POST $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "status": "pending"}'

echo -e "\n\n4. Getting all tasks..."
curl -sX GET $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nDone!"
```

Jalankan:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Example Requests (Postman)

### Import Collection

Copy dan paste JSON berikut ke Postman > Import > Raw Text:

```json
{
  "info": {
    "name": "Simple Task Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "token",
      "value": "secret-token-123:1"
    },
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"John Doe\",\n  \"email\": \"john@example.com\",\n  \"password\": \"password123\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/register",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "register"]
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"john@example.com\",\n  \"password\": \"password123\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/login",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "Get All Tasks",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/tasks",
          "host": ["{{baseUrl}}"],
          "path": ["tasks"]
        }
      }
    },
    {
      "name": "Get Task by ID",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["tasks", "1"]
        }
      }
    },
    {
      "name": "Create Task",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"New Task\",\n  \"description\": \"Task description\",\n  \"status\": \"pending\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/tasks",
          "host": ["{{baseUrl}}"],
          "path": ["tasks"]
        }
      }
    },
    {
      "name": "Update Task",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Updated Title\",\n  \"status\": \"done\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["tasks", "1"]
        }
      }
    },
    {
      "name": "Get All Tags",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/tasks/tags",
          "host": ["{{baseUrl}}"],
          "path": ["tasks", "tags"]
        }
      }
    },
    {
      "name": "Delete Task",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["tasks", "1"]
        }
      }
    }
  ]
}
```

---

## Error Responses

### 401 Unauthorized

Dikembalikan ketika:

- Token tidak ada di header
- Format token salah
- Token tidak valid

**Response:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 404 Not Found

Dikembalikan ketika:

- User tidak ditemukan (login)
- Task tidak ditemukan atau tidak milik user

**Response:**

```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

### 400 Bad Request

Dikembalikan ketika:

- Validasi request gagal
- Email sudah terdaftar (register)
- Credentials salah (login)
- Invalid priority value (harus 'low', 'medium', atau 'high')
- Invalid date format
- Terlalu banyak tags (max 10 tags per task)

**Response:**

```json
{
  "error": "Bad Request",
  "message": "Maximum 10 tags allowed per task"
}
```

---

## HTTP Status Codes

| Status Code | Description                          |
| ----------- | ------------------------------------ |
| 200         | Success (GET, PUT, DELETE)           |
| 201         | Created (POST)                       |
| 400         | Bad Request (Validation failed)      |
| 401         | Unauthorized (Invalid/missing token) |
| 404         | Not Found (Data tidak ditemukan)     |
| 500         | Internal Server Error                |

---

## Security Features

- **Password Hashing**: Menggunakan bcrypt untuk mengamankan password
- **Token Authentication**: Bearer token untuk proteksi endpoint
- **User Ownership**: User hanya bisa akses tasks miliknya sendiri
- **SQL Injection Protection**: Menggunakan parameterized queries
- **Input Validation**: Validasi request menggunakan TypeBox

---

## Project Structure

```
simple-task-management-api/
├── .github/
│   └── workflows/
│       └── deployment.yml    # CI/CD deployment
├── deploy/                   # Deployment configuration
│   ├── DEPLOYMENT.md         # Deployment guide
│   ├── eplc-test-api.caddy   # Caddy configuration
│   ├── eplc-test-api.service # Systemd service
│   └── README.md             # Quick setup guide
├── migrations/               # Database migration scripts
│   └── add-task-enhancements.ts
├── src/
│   ├── db/
│   │   ├── builders/         # Query builders
│   │   │   └── taskFilterBuilder.ts
│   │   ├── index.ts          # Database connection
│   │   ├── queries.ts        # Database queries
│   │   └── schema.ts         # Database schema
│   ├── middleware/
│   │   └── auth.ts           # Authentication middleware
│   ├── routes/
│   │   ├── auth.ts           # Auth endpoints
│   │   └── tasks.ts          # Task endpoints
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── cluster.ts            # Cluster mode entry point (multi-core)
│   └── index.ts              # Main entry point
├── .dockerignore             # Docker ignore file
├── Dockerfile                # Docker configuration
├── bun.lock
├── docker-compose.yml        # Docker Compose configuration
├── migrate.ts                # Migration script
├── package.json
├── README.md
├── tasks.db                  # SQLite database file
└── tsconfig.json
```

---

## Quick Reference

| Method | Endpoint         | Auth Required | Description                |
| ------ | ---------------- | ------------- | -------------------------- |
| POST   | `/auth/register` | No            | Register new user          |
| POST   | `/auth/login`    | No            | Login and get token        |
| GET    | `/tasks`         | Yes           | Get all tasks with filters |
| GET    | `/tasks/tags`    | Yes           | Get all unique tags        |
| GET    | `/tasks/:id`     | Yes           | Get task by ID             |
| POST   | `/tasks`         | Yes           | Create new task            |
| PUT    | `/tasks/:id`     | Yes           | Update task                |
| DELETE | `/tasks/:id`     | Yes           | Delete task                |

---

## License

MIT
