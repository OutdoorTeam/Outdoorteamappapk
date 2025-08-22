import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

console.log('Generating VAPID keys for push notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Copy these environment variables to your .env file:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_EMAIL=admin@outdoorteam.com`);
  console.log('\n');
  
  // Try to create or update .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove existing VAPID keys if they exist
  envContent = envContent.replace(/^VAPID_PUBLIC_KEY=.*$/gm, '');
  envContent = envContent.replace(/^VAPID_PRIVATE_KEY=.*$/gm, '');
  envContent = envContent.replace(/^VAPID_EMAIL=.*$/gm, '');
  
  // Clean up empty lines
  envContent = envContent.replace(/\n\n+/g, '\n').trim();
  
  // Add new VAPID keys
  if (envContent) {
    envContent += '\n';
  }
  envContent += `\n# Push Notification VAPID Keys\n`;
  envContent += `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
  envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
  envContent += `VAPID_EMAIL=admin@outdoorteam.com\n`;
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ VAPID keys have been automatically added to .env file');
  console.log('\n🔄 Please restart your server to apply the new configuration');
  console.log('\n📱 Push notifications will now work correctly');
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
