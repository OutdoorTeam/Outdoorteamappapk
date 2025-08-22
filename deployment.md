# Deployment Guide

This application is ready for production deployment. Follow these steps to deploy successfully.

## Environment Variables

Make sure the following environment variables are set in your production environment:

```env
NODE_ENV=production
PORT=3001
DATA_DIRECTORY=./data
JWT_SECRET=your-secure-jwt-secret-here
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=admin@yourapp.com
```

## Pre-deployment Steps

1. **Generate VAPID Keys** (for push notifications):
   ```bash
   npm run generate-vapid
   ```
   Copy the generated keys to your production environment variables.

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Verify build output**:
   - `dist/server/` should contain compiled server files
   - `dist/public/` should contain built client files

## Production Startup

The application starts with:
```bash
node dist/server/index.js
```

Or using the npm script:
```bash
npm run prod
```

## Docker Deployment

1. **Build the Docker image**:
   ```bash
   docker build -t outdoor-team-app .
   ```

2. **Run with environment variables**:
   ```bash
   docker run -d \
     --name outdoor-team-app \
     -p 3001:3001 \
     -v $(pwd)/data:/app/data \
     -e NODE_ENV=production \
     -e JWT_SECRET=your-secret \
     -e VAPID_PUBLIC_KEY=your-public-key \
     -e VAPID_PRIVATE_KEY=your-private-key \
     outdoor-team-app
   ```

## Health Check

The application provides a health check endpoint:
```
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "port": 3001,
  "dataDirectory": "./data"
}
```

## Database

- SQLite database is automatically created in the DATA_DIRECTORY
- No manual migration needed - tables are created on first startup
- Database file: `{DATA_DIRECTORY}/database.sqlite`

## File Storage

- User uploads are stored in `{DATA_DIRECTORY}/uploads/`
- Ensure the data directory has proper write permissions

## Security Considerations

1. **JWT Secret**: Use a strong, random JWT secret in production
2. **HTTPS**: Deploy behind HTTPS in production
3. **Rate Limiting**: Rate limiting is enabled by default
4. **CORS**: Properly configured for your domain
5. **File Upload**: Limited to PDFs, 10MB max size

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Ensure DATA_DIRECTORY exists and is writable
   - Check file permissions

2. **Static files not serving**:
   - Verify `dist/public/` contains built frontend files
   - Check NODE_ENV is set to "production"

3. **Push notifications not working**:
   - Generate and set VAPID keys
   - Restart the server after setting keys

4. **CORS errors**:
   - Update allowed origins in `server/config/cors.ts`
   - Ensure your domain is in the allowed list

### Logs

The application logs important events to:
- Console output
- System logs table in database

Check logs for detailed error information.
