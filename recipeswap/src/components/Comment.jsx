import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FaHeart, FaRegHeart, FaReply, FaUserCircle } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const Comment = ({ 
  comment, 
  userId, 
  onReply, 
  level = 0,
  onLike,
  onDelete
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Check if the current user has liked this comment
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!userId) return;
      
      try {
        const { count, error } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id)
          .eq('user_id', userId);

        if (error) throw error;
        
        setIsLiked(count > 0);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkIfLiked();
  }, [comment.id, userId]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', comment.user_id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [comment.user_id]);

  const handleLike = async () => {
    if (!userId) return;

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', userId);

        if (error) throw error;
        
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert([
            { 
              comment_id: comment.id, 
              user_id: userId 
            }
          ]);

        if (error) throw error;
        
        setLikeCount(prev => prev + 1);
        
        // Notify the comment owner (if not the current user)
        if (comment.user_id !== userId) {
          await supabase.from('notifications').insert([{
            user_id: comment.user_id,
            from_user_id: userId,
            type: 'comment_like',
            reference_id: comment.id
          }]);
        }
      }
      
      setIsLiked(!isLiked);
      if (onLike) onLike(comment.id, !isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !userId) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          { 
            content: replyContent,
            recipe_id: comment.recipe_id,
            user_id: userId,
            parent_id: comment.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Notify the parent comment's author
      if (comment.user_id !== userId) {
        await supabase.from('notifications').insert([{
          user_id: comment.user_id,
          from_user_id: userId,
          type: 'comment_reply',
          reference_id: comment.id
        }]);
      }

      setReplyContent('');
      setShowReplyForm(false);
      
      // Call the onReply callback if provided
      if (onReply) onReply(data);
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(comment.id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnComment = userId === comment.user_id;
  const marginLeft = level > 0 ? `ml-${Math.min(level * 4, 16)}` : '';

  return (
    <div className={`mb-4 ${marginLeft}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {userProfile?.avatar_url ? (
            <img 
              src={userProfile.avatar_url} 
              alt={userProfile?.username || 'User'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <FaUserCircle className="w-10 h-10 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {userProfile?.username || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              {isOwnComment && (
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-800">{comment.content}</p>
            <div className="mt-2 flex items-center space-x-4 text-xs">
              <button 
                onClick={handleLike}
                className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
                disabled={!userId}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span>{likeCount}</span>
              </button>
              {level < 2 && (
                <button 
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                  disabled={!userId}
                >
                  <FaReply />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </div>
          
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="mt-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button 
                  type="submit" 
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Reply
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              userId={userId}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment;
