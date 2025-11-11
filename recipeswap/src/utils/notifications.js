import OneSignal from '@onesignal/onesignal-react';
import { supabase } from '../lib/supabase';

export const initializeOneSignal = async () => {
  if (!process.env.REACT_APP_ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not found. Notifications will be disabled.');
    return;
  }

  try {
    await OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      autoRegister: true,
      notifyButton: {
        enable: true,
      },
    });
    
    console.log('OneSignal initialized successfully');
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
  }
};

export const sendNotification = async (userId, message, data = {}) => {
  if (!userId || !message) return;

  try {
    // First, save the notification to the database
    const { error } = await supabase
      .from('notifications')
      .insert([
        { 
          user_id: userId,
          message,
          type: data.type || 'info',
          metadata: data.metadata || {}
        }
      ]);

    if (error) throw error;

    // Then send push notification if OneSignal is available
    if (window.OneSignal) {
      await window.OneSignal.setExternalUserId(userId);
      await window.OneSignal.sendSelfNotification({
        contents: { en: message },
        data: data
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
