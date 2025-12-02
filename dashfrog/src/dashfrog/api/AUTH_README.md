# Authentication

DashFrog API uses OAuth2 with Password Bearer tokens for authentication.

## Configuration

Authentication credentials are configured via environment variables or DashFrog Config:

```bash
# Environment variables
export DASHFROG_API_USERNAME=admin
export DASHFROG_API_PASSWORD=your-secure-password
export DASHFROG_API_SECRET_KEY=your-secret-key-for-jwt
```

Or in Python:

```python
from dashfrog import Config, setup

config = Config(
    api_username="admin",
    api_password="your-secure-password",
    api_secret_key="your-secret-key-for-jwt"
)
setup(config)
```

**Default values:**
- Username: `admin`
- Password: `admin`
- Secret Key: `change-this-secret-key-in-production`

⚠️ **WARNING: Change these in production!**

## Quick Start

### 1. Get an Access Token

```bash
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Use the Token

Include the token in the `Authorization` header for protected endpoints:

```bash
curl -X POST "http://localhost:8000/api/flows/search" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"start": "2024-01-01T00:00:00Z", "end": "2024-01-31T23:59:59Z", "tenant": "acme-corp"}'
```

## Protecting Endpoints

To protect an endpoint, add the `verify_token` dependency:

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from .auth import verify_token

router = APIRouter()

@router.get("/protected")
async def protected_endpoint(auth: Annotated[None, Depends(verify_token)]):
    return {"message": "This endpoint is protected"}
```

The `verify_token` dependency validates the JWT token. If invalid, it raises a 401 Unauthorized error.

## Configuration

### Token Expiration

Tokens expire after 30 minutes by default. Change in `auth.py`:

```python
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

## Security Notes

- Single user authentication based on config credentials
- Passwords are compared as plain text (configure via environment variables)
- JWT tokens are signed with the configured secret key
- No password hashing needed since credentials are configured, not user-supplied

## Frontend Integration

### JavaScript/TypeScript Example

```typescript
// Login
const response = await fetch('http://localhost:8000/api/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    username: 'admin',
    password: 'admin',
  }),
});

const { access_token } = await response.json();

// Store token
localStorage.setItem('access_token', access_token);

// Use token for authenticated requests
const protectedResponse = await fetch('http://localhost:8000/api/flows/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z',
    tenant: 'acme-corp',
  }),
});
```

## API Endpoints

### POST `/api/auth/token`

Get an access token.

**Request:**
- Content-Type: `application/x-www-form-urlencoded`
- Body: `username=<username>&password=<password>`

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```
