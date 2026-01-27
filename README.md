# Simple Task Management API

REST API untuk sistem manajemen tugas sederhana dengan fungsionalitas CRUD lengkap, autentikasi berbasis token, dan validasi request.

## Tech Stack

- **Runtime**: Bun 1.3.6
- **Framework**: ElysiaJS 1.4.22
- **Language**: TypeScript 5.x
- **Database**: SQLite (bun:sqlite)
- **Password Hashing**: bcrypt

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

## Running the Server

### Development Mode

```bash
bun run dev
```

Server akan berjalan di `http://localhost:3000` dengan hot-reload enabled.

### Production Mode

```bash
bun run src/index.ts
```

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
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

#### POST /api/register

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

#### POST /api/login

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

#### GET /api/tasks

Get semua tasks milik user yang sedang login.

**Headers:**

```
Authorization: Bearer secret-token-123:1
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "title": "Task 1",
    "description": "Description 1",
    "status": "pending",
    "user_id": 1,
    "created_at": "2026-01-27T10:00:00.000Z",
    "updated_at": "2026-01-27T10:00:00.000Z"
  }
]
```

---

#### GET /api/tasks/:id

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
  "user_id": 1,
  "created_at": "2026-01-27T10:00:00.000Z",
  "updated_at": "2026-01-27T10:00:00.000Z"
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

#### POST /api/tasks

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
  "status": "pending"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "user_id": 1,
  "created_at": "2026-01-27T11:00:00.000Z",
  "updated_at": "2026-01-27T11:00:00.000Z"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Bad Request",
  "message": "Failed to create task"
}
```

**Validation Rules:**

- `title`: Required, min 1 character
- `description`: Optional
- `status`: Optional, must be 'pending' or 'done' (default: 'pending')

---

#### PUT /api/tasks/:id

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
  "status": "done"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Description 1",
  "status": "done",
  "user_id": 1,
  "created_at": "2026-01-27T10:00:00.000Z",
  "updated_at": "2026-01-27T12:00:00.000Z"
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

#### DELETE /api/tasks/:id

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
curl -sX POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**

```bash
curl -sX POST http://localhost:3000/api/login \
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
curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

**Get Task by ID:**

```bash
curl -sX GET http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Create Task (Full):**

```bash
curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "status": "pending"
  }'
```

**Create Task (Minimal):**

```bash
curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Simple task"}'
```

**Update Task - Multiple Fields:**

```bash
curl -sX PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "status": "done"
  }'
```

**Update Task - Only Status:**

```bash
curl -sX PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

**Update Task - Only Description:**

```bash
curl -sX PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

**Delete Task:**

```bash
curl -sX DELETE http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Complete Workflow Example

Script lengkap dari registration sampai task management:

```bash
# 1. Register a new user
curl -sX POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "securepass123"
  }'

# 2. Login and save token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepass123"
  }' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 3. Create multiple tasks
curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Complete project documentation", "status": "pending"}'

curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Review pull requests", "description": "Check all open PRs", "status": "pending"}'

curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy to production", "status": "done"}'

# 4. Get all tasks
curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# 5. Get a specific task
curl -sX GET http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"

# 6. Update a task
curl -sX PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# 7. Delete a task
curl -sX DELETE http://localhost:3000/api/tasks/3 \
  -H "Authorization: Bearer $TOKEN"

# 8. Get all tasks again to see changes
curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

---

### Testing Error Scenarios

**Test 401 Unauthorized (Missing Token):**

```bash
curl -sX GET http://localhost:3000/api/tasks
```

**Test 401 Unauthorized (Invalid Token):**

```bash
curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer invalid-token"
```

**Test 404 Not Found (User Not Found):**

```bash
curl -sX POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }'
```

**Test 404 Not Found (Task Not Found):**

```bash
curl -sX GET http://localhost:3000/api/tasks/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Test 400 Bad Request (Invalid Credentials):**

```bash
curl -sX POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrongpassword"
  }'
```

**Test 400 Bad Request (Email Already Registered):**

```bash
curl -sX POST http://localhost:3000/api/register \
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
curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Save Token untuk Testing:**

```bash
# Login dan save token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
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
echo "" && curl -sX POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' | jq
```

**Method 2 - Untuk multiple requests dengan newline sebelum response:**

```bash
echo "" && curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task 1"}' | jq

echo "" && curl -sX POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task 2"}' | jq

echo "" && curl -sX GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Create Test Script:**

Simpan sebagai `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "1. Registering user..."
curl -sX POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'

echo -e "\n\n2. Logging in..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

echo -e "\n\n3. Creating task..."
curl -sX POST $BASE_URL/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "status": "pending"}'

echo -e "\n\n4. Getting all tasks..."
curl -sX GET $BASE_URL/api/tasks \
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
          "raw": "{{baseUrl}}/api/register",
          "host": ["{{baseUrl}}"],
          "path": ["api", "register"]
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
          "raw": "{{baseUrl}}/api/login",
          "host": ["{{baseUrl}}"],
          "path": ["api", "login"]
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
          "raw": "{{baseUrl}}/api/tasks",
          "host": ["{{baseUrl}}"],
          "path": ["api", "tasks"]
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
          "raw": "{{baseUrl}}/api/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "tasks", "1"]
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
          "raw": "{{baseUrl}}/api/tasks",
          "host": ["{{baseUrl}}"],
          "path": ["api", "tasks"]
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
          "raw": "{{baseUrl}}/api/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "tasks", "1"]
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
          "raw": "{{baseUrl}}/api/tasks/1",
          "host": ["{{baseUrl}}"],
          "path": ["api", "tasks", "1"]
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

**Response:**

```json
{
  "error": "Bad Request",
  "message": "Validation failed"
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
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema.ts         # Database schema
│   │   └── queries.ts        # Database queries
│   ├── middleware/
│   │   └── auth.ts           # Authentication middleware
│   ├── routes/
│   │   ├── auth.ts           # Auth endpoints
│   │   └── tasks.ts          # Task endpoints
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── index.ts              # Main entry point
├── tasks.db                  # SQLite database file
├── package.json
├── tsconfig.json
├── bun.lock
└── README.md
```

---

## Quick Reference

| Method | Endpoint         | Auth Required | Description          |
| ------ | ---------------- | ------------- | -------------------- |
| POST   | `/api/register`  | No            | Register new user    |
| POST   | `/api/login`     | No            | Login and get token  |
| GET    | `/api/tasks`     | Yes           | Get all user's tasks |
| GET    | `/api/tasks/:id` | Yes           | Get task by ID       |
| POST   | `/api/tasks`     | Yes           | Create new task      |
| PUT    | `/api/tasks/:id` | Yes           | Update task          |
| DELETE | `/api/tasks/:id` | Yes           | Delete task          |

---

## License

MIT
