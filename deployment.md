# Deployment Guide

This application is configured for deployment on Instance and other platforms. Follow these steps for successful deployment.

## Instance Deployment

### Prerequisites
- Instance account set up
- Repository connected to Instance

### Configuration Files
The project includes the following deployment configuration:

- `instance.json` - Instance-specific configuration
- `.instanceignore` - Files to exclude from deployment
- Updated `package.json` with proper scripts

### Environment Variables
Set these environment variables in your Instance dashboard:

**Required:**
```env
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
DATA_DIRECTORY=./data
```

**Optional (for push notifications):**
```env
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=admin@yourapp.com
```

**Optional (for advanced features):**
```env
INTERNAL_API_KEY=your-internal-api-key
INTERNAL_IPS=127.0.0.1,::1
DISABLE_RATE_LIMITING=false
```

### Deployment Process

Instance will automatically:

1. **Install Dependencies**: `npm ci`
2. **Build Application**: `npm run build`
   - Builds frontend with Vite → `dist/public/`
   - Compiles TypeScript backend → `dist/server/`
3. **Start Application**: `npm run prod`
   - Runs `node dist/server/index.js`

### Health Check
- Endpoint: `/health`
- Returns application status and configuration info
- Used by Instance to monitor application health

## Manual Deployment Steps

If deploying manually to other platforms:

1. **Clone and Setup**:
   ```bash
   git clone <your-repo>
   cd outdoor-team-app
   npm ci
   ```

2. **Set Environment Variables**:
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your-secure-secret
   export DATA_DIRECTORY=./data
   # Add other variables as needed
   ```

3. **Build Application**:
   ```bash
   npm run build
   ```

4. **Start Production Server**:
   ```bash
   npm run prod
   ```

## Application Architecture

### Build Output Structure
```
dist/
├── public/          # Frontend build (served by Express)
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/          # Compiled backend
    ├── index.js
    ├── routes/
    ├── middleware/
    └── ...
```

### Runtime Behavior
- Express server serves both API (`/api/*`) and static files
- SQLite database auto-created in `DATA_DIRECTORY`
- File uploads stored in `DATA_DIRECTORY/uploads/`
- Admin user auto-created on first startup

## Database

- **Type**: SQLite
- **Location**: `{DATA_DIRECTORY}/database.sqlite`
- **Migration**: Automatic on startup
- **Backup**: File-based, easy to backup entire data directory

## Security Features

- JWT authentication with configurable secret
- Rate limiting on all API routes
- CORS protection for frontend domain
- Input validation and sanitization
- Security headers on all responses

## Monitoring and Logs

### Health Check Endpoint
```bash
curl https://your-app.instance.app/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "port": 3001,
  "dataDirectory": "./data"
}
```

### Application Logs
- Console output for deployment logs
- Database logs stored in `system_logs` table
- Error tracking and performance monitoring built-in

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Ensure Node.js version ≥18
   - Check for TypeScript errors
   - Verify all dependencies are declared

2. **Database Issues**:
   - Ensure `DATA_DIRECTORY` is writable
   - Check SQLite file permissions
   - Verify disk space availability

3. **Static Files Not Loading**:
   - Confirm `dist/public/` contains built frontend
   - Check server static file configuration
   - Verify Express routes don't conflict

4. **Environment Variables**:
   - JWT_SECRET must be set and secure (≥32 chars)
   - DATA_DIRECTORY must exist and be writable
   - PORT defaults to 3001 if not specified

### Debug Mode
For debugging in production, temporarily set:
```env
DEBUG=true
DISABLE_RATE_LIMITING=true  # Only for debugging
```

### Support
- Check Instance dashboard for deployment logs
- Use health check endpoint to verify status
- Review application logs in database `system_logs` table

## Performance Optimization

- Static files served with proper caching headers
- Database queries optimized with indexes
- Rate limiting prevents abuse
- Gzip compression enabled
- Efficient bundle sizes with Vite

## Scaling Considerations

- SQLite suitable for small to medium applications
- Consider PostgreSQL for high-traffic scenarios
- File uploads stored locally (consider cloud storage for scale)
- Session management via JWT (stateless)
