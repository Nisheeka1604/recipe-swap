import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FaBell, FaRegBell } from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';

const NotificationBell = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef(null);

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    if (!userId) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          from_user:profiles!notifications_from_user_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationId = null) => {
    if (!userId) return;
    
    try {
      const updates = {
        is_read: true,
        updated_at: new Date().toISOString()
      };
      
      let query = supabase
        .from('notifications')
        .update(updates)
        .eq('user_id', userId);
      
      if (notificationId) {
        query = query.eq('id', notificationId);
      } else {
        query = query.eq('is_read', false);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      // Update local state
      if (notificationId) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      } else {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!userId) return;
    
    // Initial fetch
    fetchUnreadCount();
    if (isOpen) {
      fetchNotifications();
    }
    
    // Subscribe to notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          // Update unread count
          fetchUnreadCount();
          
          // If panel is open, update notifications
          if (isOpen) {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => 
                prev.map(n => n.id === payload.new.id ? payload.new : n)
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => 
                prev.filter(n => n.id !== payload.old.id)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const togglePanel = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      await fetchNotifications();
      // Mark all as read when opening the panel
      if (unreadCount > 0) {
        markAsRead();
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Close the panel
    setIsOpen(false);
    
    // Navigate based on notification type
    // This would be implemented based on your routing
    switch (notification.type) {
      case 'comment':
      case 'comment_reply':
        // Navigate to the recipe with the comment
        window.location.href = `/recipe/${notification.reference_id}`;
        break;
      case 'like':
        // Navigate to the recipe
        window.location.href = `/recipe/${notification.reference_id}`;
        break;
      case 'follow':
        // Navigate to the user's profile
        window.location.href = `/profile/${notification.from_user_id}`;
        break;
      case 'rating':
        // Navigate to the recipe
        window.location.href = `/recipe/${notification.reference_id}`;
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={togglePanel}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <FaBell className="w-5 h-5" />
        ) : (
          <FaRegBell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <NotificationPanel 
          notifications={notifications} 
          isLoading={isLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={() => markAsRead()}
        />
      )}
    </div>
  );
};

export default NotificationBell;
