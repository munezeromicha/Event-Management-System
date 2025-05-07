import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RENDER_URL = process.env.RENDER_URL || 'https://your-render-app-url.onrender.com';

// Function to ping the server
const pingServer = async () => {
  try {
    const response = await axios.get(`${RENDER_URL}/api/health`);
    console.log(`[${new Date().toISOString()}] Server pinged successfully:`, response.status);
  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Error pinging server:`, error instanceof Error ? error.message : String(error));
  }
};

// Schedule the cron job to run every 14 minutes
// This ensures the server stays active as Render's free tier has a 15-minute timeout
export const startKeepAliveCron = () => {
  console.log('Starting keep-alive cron job...');
  
  // Run immediately on startup
  pingServer();
  
  // Schedule to run every 14 minutes
  cron.schedule('*/14 * * * *', () => {
    pingServer();
  });
}; 