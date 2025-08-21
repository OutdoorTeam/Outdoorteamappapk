module.exports = {
  apps: [{
    name: 'outdoor-team-app',
    script: './public/server/index.js',
    cwd: '/var/www/outdoorteam',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATA_DIRECTORY: './data',
      JWT_SECRET: 'outdoor-team-super-secure-jwt-key-change-in-production-2024',
      ALLOWED_ORIGINS: 'https://app.outdoorteam.com,https://outdoorteam.com,https://www.outdoorteam.com',
      TRUST_PROXY: '1'
    },
    
    // Process management
    instances: 1,
    exec_mode: 'fork',
    
    // Memory and performance
    max_memory_restart: '512M',
    node_args: '--max-old-space-size=512',
    
    // Restart policies
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Advanced options
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Health monitoring
    health_check_grace_period: 3000,
    
    // Auto restart on file changes (disabled in production)
    watch: false,
    
    // Merge logs from all instances
    merge_logs: true,
    
    // Automatic restart if app crashes
    autorestart: true,
    
    // Source map support for better error traces
    source_map_support: true
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'www-data',
      host: 'app.outdoorteam.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/outdoor-team.git',
      path: '/var/www/outdoorteam',
      'post-deploy': 'npm ci --omit=dev && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git nodejs npm -y'
    }
  }
};
