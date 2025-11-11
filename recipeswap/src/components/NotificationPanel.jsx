import { FaCheck, FaRegComment, FaHeart, FaUserPlus, FaStar } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = ({ 
  notifications, 
  isLoading, 
  onNotificationClick, 
  onMarkAllAsRead 
}) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
      case 'comment_reply':
        return <FaRegComment className="text-blue-500" />;
      case 'like':
      case 'comment_like':
        return <FaHeart className="text-red-500" />;
      case 'follow':
        return <FaUserPlus className="text-green-500" />;
      case 'rating':
        return <FaStar className="text-yellow-500" />;
      default:
        return <FaRegComment className="text-gray-400" />;
    }
  };

  const getNotificationMessage = (notification) => {
    const username = notification.from_user?.username || 'Someone';
    
    switch (notification.type) {
      case 'comment':
        return `${username} commented on your recipe`;
      case 'comment_reply':
        return `${username} replied to your comment`;
      case 'like':
        return `${username} liked your recipe`;
      case 'comment_like':
        return `${username} liked your comment`;
      case 'follow':
        return `${username} started following you`;
      case 'rating':
        return `${username} rated your recipe`;
      default:
        return 'New notification';
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Notifications</h3>
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <li 
                key={notification.id}
                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
              >
                <button
                  onClick={() => onNotificationClick(notification)}
                  className="w-full text-left p-3 flex items-start space-x-3 focus:outline-none"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.from_user?.avatar_url ? (
                      <img 
                        src={notification.from_user.avatar_url} 
                        alt={notification.from_user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      {getNotificationMessage(notification)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
          <a 
            href="/notifications" 
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
