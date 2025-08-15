#!/usr/bin/env node

import webPush from 'web-push';
import fs from 'fs';
import path from 'path';

try {
  console.log('Generating VAPID keys...');
  
  const vapidKeys = webPush.generateVAPIDKeys();
  
  console.log('\n=== VAPID Keys Generated ===');
  console.log('Public Key:', vapidKeys.publicKey);
  console.log('Private Key:', vapidKeys.privateKey);
  
  // Create .env.example if it doesn't exist
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envExampleContent = `# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=admin@outdoorteam.com

# Database
DATA_DIRECTORY=./data

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Server Port
PORT=3001
`;

  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('\n✅ Created .env.example with VAPID keys');
  }
  
  // Check if .env exists and update it
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update existing keys or add new ones
    if (envContent.includes('VAPID_PUBLIC_KEY=')) {
      envContent = envContent.replace(/VAPID_PUBLIC_KEY=.*/, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    } else {
      envContent += `\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;
    }
    
    if (envContent.includes('VAPID_PRIVATE_KEY=')) {
      envContent = envContent.replace(/VAPID_PRIVATE_KEY=.*/, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    } else {
      envContent += `\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
    }
    
    if (!envContent.includes('VAPID_EMAIL=')) {
      envContent += `\nVAPID_EMAIL=admin@outdoorteam.com`;
    }
  } else {
    envContent = envExampleContent;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env with new VAPID keys');
  
  console.log('\n=== Next Steps ===');
  console.log('1. Restart your server to use the new keys');
  console.log('2. Users may need to re-enable notifications in their browser');
  console.log('3. Test notifications from the admin panel');
  
} catch (error) {
  console.error('Error generating VAPID keys:', error);
  process.exit(1);
}
