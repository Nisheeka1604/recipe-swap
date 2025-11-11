import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, 
  FaClock, FaUtensils, FaUser, FaComment, FaStar, 
  FaRegStar, FaEllipsisV, FaEdit, FaTrash, FaReply
} from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import RatingStars from './RatingStars';
import Comment from './Comment';

// Types
type Media = {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  position: number;
};

type CommentType = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  like_count?: number;
  replies?: CommentType[];
};

type Recipe = {
  id: string;
  title: string;
  description: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  user_id: string;
  created_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  ratings?: { rating: number }[];
  ingredients?: string[];
  instructions?: string[];
};

const RecipeDetail = () => {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [media, setMedia] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const commentInputRef = useRef(null);
  const navigate = useNavigate();

  const checkIfLiked = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('recipe_id', id)
      .single();

    if (!error && data) {
      setIsLiked(true);
    }
  };

  const checkIfSaved = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('recipe_id', id)
      .single();

    if (!error && data) {
      setIsSaved(true);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/recipe/${id}` } });
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', id);

        if (error) throw error;

        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, recipe_id: id }]);

        if (error) throw error;

        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        
        // Create notification for recipe author if not the current user
        if (recipe && recipe.user_id !== user.id) {
          await supabase.from('notifications').insert([{
            user_id: recipe.user_id,
            from_user_id: user.id,
            type: 'like',
            reference_id: id
          }]);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/recipe/${id}` } });
      return;
    }

    try {
      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', id);

        if (error) throw error;
      } else {
        // Save
        const { error } = await supabase
          .from('saved_recipes')
          .insert([{ user_id: user.id, recipe_id: id }]);

        if (error) throw error;
      }

      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      
      // Get recipe with author details and average rating
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          *,
          author:profiles!recipes_user_id_fkey(
            id,
            username,
            avatar_url
          ),
          ratings:ratings(
            rating
          )
        `)
        .eq('id', id)
        .single();

      if (recipeError) throw recipeError;
      
      // Calculate average rating
      if (recipeData.ratings && recipeData.ratings.length > 0) {
        const total = recipeData.ratings.reduce((sum, r) => sum + r.rating, 0);
        const avg = total / recipeData.ratings.length;
        setAverageRating(parseFloat(avg.toFixed(1)));
      }
      
      setRecipe(recipeData);
      
      // Check if user has rated this recipe
      if (user) {
        const { data: userRatingData, error: ratingError } = await supabase
          .from('ratings')
          .select('rating')
          .eq('recipe_id', id)
          .eq('user_id', user.id)
          .single();
          
        if (userRatingData) {
          setUserRating(userRatingData.rating);
        }
      }
      
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('recipe_media')
      .select('*')
      .eq('recipe_id', id)
      .order('position', { ascending: true });

    if (!error && data) {
      setMedia(data);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles!comments_user_id_fkey(
            id,
            username,
            avatar_url
          ),
          likes:comment_likes(count)
        `)
        .eq('recipe_id', id)
        .is('parent_id', null) // Only top-level comments
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each comment, fetch its replies
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies, error: repliesError } = await supabase
            .from('comments')
            .select(`
              *,
              user:profiles!comments_user_id_fkey(
                id,
                username,
                avatar_url
              ),
              likes:comment_likes(count)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          if (repliesError) throw repliesError;

          return {
            ...comment,
            replies: replies || [],
            like_count: comment.likes?.[0]?.count || 0
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleRatingChange = async (rating) => {
    if (!user) {
      navigate('/login', { state: { from: `/recipe/${id}` } });
      return;
    }

    try {
      const { error } = await supabase.rpc('upsert_rating', {
        p_recipe_id: id,
        p_user_id: user.id,
        p_rating: rating
      });

      if (error) throw error;

      // Update local state
      setUserRating(rating);
      
      // Re-fetch recipe to update average rating
      fetchRecipe();
      
      // Create notification for recipe author if not the current user
      if (recipe && recipe.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: recipe.user_id,
          from_user_id: user.id,
          type: 'rating',
          reference_id: id
        }]);
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/login', { state: { from: `/recipe/${id}` } });
      return;
    }
    
    if (!commentContent.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          { 
            content: commentContent,
            recipe_id: id,
            user_id: user.id,
            parent_id: replyingTo?.commentId || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Reset form
      setCommentContent('');
      setShowCommentForm(false);
      setReplyingTo(null);
      
      // Re-fetch comments to update the list
      fetchComments();
      
      // Create notification for recipe author if not the current user
      if (recipe && recipe.user_id !== user.id && !replyingTo) {
        await supabase.from('notifications').insert([{
          user_id: recipe.user_id,
          from_user_id: user.id,
          type: 'comment',
          reference_id: id
        }]);
      }
      
      // Create notification for the user being replied to if it's a reply
      if (replyingTo && replyingTo.userId !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: replyingTo.userId,
          from_user_id: user.id,
          type: 'comment_reply',
          reference_id: replyingTo.commentId
        }]);
      }
      
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleCommentLike = async (commentId, isLiked) => {
    if (!user) {
      navigate('/login', { state: { from: `/recipe/${id}` } });
      return;
    }
    
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: user.id }]);
          
        if (error) throw error;
        
        // Create notification for comment author if not the current user
        const comment = findCommentById(comments, commentId);
        if (comment && comment.user_id !== user.id) {
          await supabase.from('notifications').insert([{
            user_id: comment.user_id,
            from_user_id: user.id,
            type: 'comment_like',
            reference_id: commentId
          }]);
        }
      }
      
      // Update local state
      const updateCommentLikes = (comments, targetId, increment) => {
        return comments.map(comment => {
          if (comment.id === targetId) {
            return {
              ...comment,
              like_count: (comment.like_count || 0) + (increment ? 1 : -1)
            };
          }
          
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentLikes(comment.replies, targetId, increment)
            };
          }
          
          return comment;
        });
      };
      
      setComments(prev => updateCommentLikes(prev, commentId, !isLiked));
      
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };
  
  const findCommentById = (comments, commentId) => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      if (comment.replies) {
        const found = findCommentById(comment.replies, commentId);
        if (found) return found;
      }
    }
    return null;
  };
  
  const handleReply = (commentId, username, userId) => {
    setReplyingTo({ commentId, username, userId });
    setShowCommentForm(true);
    
    // Focus the comment input
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 100);
  };
  
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
        
      if (error) throw error;
      
      // Remove the comment from the local state
      const removeComment = (comments, targetId) => {
        return comments.reduce((acc, comment) => {
          if (comment.id === targetId) return acc;
          
          if (comment.replies && comment.replies.length > 0) {
            return [...acc, {
              ...comment,
              replies: removeComment(comment.replies, targetId)
            }];
          }
          
          return [...acc, comment];
        }, []);
      };
      
      setComments(prev => removeComment(prev, commentId));
      
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  useEffect(() => {
    fetchRecipe();
    fetchMedia();
    checkIfLiked();
    checkIfSaved();
    fetchComments();
    getCurrentUser();
    
    const commentsSubscription = supabase
      .channel('comments')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: `recipe_id=eq.${id}`
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT' && !payload.new.parent_id) {
            fetchComments();
          } else if (payload.eventType === 'DELETE') {
            const removeComment = (comments, targetId) => {
              return comments.reduce((acc, comment) => {
                if (comment.id === targetId) return acc;
                
                if (comment.replies && comment.replies.length > 0) {
                  return [...acc, {
                    ...comment,
                    replies: removeComment(comment.replies, targetId)
                  }];
                }
                
                return [...acc, comment];
              }, []);
            };
            
            setComments(prev => removeComment(prev, payload.old.id));
          }
        }
      )
      .subscribe();
      
    const ratingsSubscription = supabase
      .channel('ratings')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ratings',
          filter: `recipe_id=eq.${id}`
        },
        () => {
          fetchRecipe();
        }
      )
      .subscribe();
      
    const commentLikesSubscription = supabase
      .channel('comment_likes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comment_likes',
          filter: `comment_id=in.(${comments.map(c => `'${c.id}'`).join(',')})`
        },
        (payload) => {
          const updateCommentLikes = (comments, targetId, increment) => {
            return comments.map(comment => {
              if (comment.id === targetId) {
                return {
                  ...comment,
                  like_count: (comment.like_count || 0) + (increment ? 1 : -1)
                };
              }
              
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentLikes(comment.replies, targetId, increment)
                };
              }
              
              return comment;
            });
          };
          
          if (payload.eventType === 'INSERT') {
            setComments(prev => updateCommentLikes(prev, payload.new.comment_id, true));
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => updateCommentLikes(prev, payload.old.comment_id, false));
          }
        }
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
      ratingsSubscription.unsubscribe();
      commentLikesSubscription.unsubscribe();
    };
  }, [id, user?.id]);

  const getCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % media.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + media.length) % media.length);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Recipe not found</h2>
        <Link to="/" className="text-blue-500 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const currentMedia = media[currentImageIndex] || {};

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Recipe Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
        <div className="flex items-center text-gray-600 mb-4">
          <Link 
            to={`/profile/${recipe.user_id}`}
            className="flex items-center hover:underline"
          >
            {recipe.profiles?.avatar_url ? (
              <img 
                src={recipe.profiles.avatar_url} 
                alt={recipe.profiles.username}
                className="w-8 h-8 rounded-full mr-2"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                <FaUser className="text-gray-500" />
              </div>
            )}
            <span>{recipe.profiles?.username || 'Unknown User'}</span>
          </Link>
          <span className="mx-2">•</span>
          <span>{formatDistanceToNow(new Date(recipe.created_at), { addSuffix: true })}</span>
        </div>
        
        {/* Media Carousel */}
        <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-100">
          {media.length > 0 ? (
            <>
              {currentMedia.media_type === 'image' ? (
                <img 
                  src={currentMedia.url} 
                  alt={`${recipe.title} - ${currentImageIndex + 1} of ${media.length}`}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <video 
                  src={currentMedia.url}
                  controls
                  className="w-full h-96 object-cover"
                />
              )}
              
              {media.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                    {media.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full ${currentImageIndex === index ? 'bg-white' : 'bg-white/50'}`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-96 flex items-center justify-center bg-gray-200 text-gray-500">
              No media available
            </div>
          )}
          
          <div className="absolute top-4 right-4 flex space-x-2">
            <button 
              onClick={handleLike}
              className={`p-2 rounded-full ${isLiked ? 'bg-red-100 text-red-500' : 'bg-white/90 text-gray-700 hover:bg-gray-100'} transition-colors`}
              aria-label={isLiked ? 'Unlike recipe' : 'Like recipe'}
            >
              <FaHeart className={isLiked ? 'fill-current' : ''} />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={isSaved ? 'Unsave recipe' : 'Save recipe'}
            >
              {isSaved ? 
                <FaBookmark className="text-yellow-500 fill-current" /> : 
                <FaRegBookmark />}
            </button>
          </div>
        </div>
        
        {/* Recipe Stats */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center text-gray-700">
            <FaHeart className="text-red-500 mr-1" />
            <span>{likeCount} likes</span>
          </div>
          <div className="flex items-center text-gray-700">
            <FaComment className="text-blue-500 mr-1" />
            <span>{comments.length} comments</span>
          </div>
          {totalTime > 0 && (
            <div className="flex items-center text-gray-700">
              <FaClock className="text-gray-500 mr-1" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center text-gray-700">
              <FaUtensils className="text-green-500 mr-1" />
              <span className="capitalize">{recipe.difficulty}</span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {recipe.description && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{recipe.description}</p>
          </div>
        )}
      </div>
      
      {/* Recipe Content */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Ingredients */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {Array.isArray(recipe.ingredients) ? (
              recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></span>
                  <span>{ingredient}</span>
                </li>
              ))
            ) : (
              <li>No ingredients listed</li>
            )}
          </ul>
        </div>
        
        {/* Instructions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Instructions</h2>
          <ol className="space-y-4">
            {Array.isArray(recipe.instructions) ? (
              recipe.instructions.map((step, index) => (
                <li key={index} className="flex">
                  <span className="font-bold text-lg mr-2">{index + 1}.</span>
                  <div>
                    <h3 className="font-semibold">{step.title || `Step ${index + 1}`}</h3>
                    {step.description && <p className="text-gray-700">{step.description}</p>}
                    {step.image && (
                      <img 
                        src={step.image} 
                        alt={`Step ${index + 1}`} 
                        className="mt-2 rounded-lg max-w-full h-auto"
                      />
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li>No instructions provided</li>
            )}
          </ol>
        </div>
      </div>
      
      {/* Comments Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
        
        {/* Add Comment */}
        {user ? (
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.full_name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <FaUser className="text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link> to leave a comment
            </p>
          </div>
        )}
        
        {/* Comments List */}
        <div className="space-y-6">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  {comment.profiles?.avatar_url ? (
                    <img 
                      src={comment.profiles.avatar_url} 
                      alt={comment.profiles.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <FaUser className="text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link 
                          to={`/profile/${comment.user_id}`}
                          className="font-semibold hover:underline"
                        >
                          {comment.profiles?.username || 'Unknown User'}
                        </Link>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {user?.id === comment.user_id && (
                        <button 
                          onClick={async () => {
                            const { error } = await supabase
                              .from('comments')
                              .delete()
                              .eq('id', comment.id);
                            
                            if (!error) {
                              setComments(prev => prev.filter(c => c.id !== comment.id));
                            }
                          }}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Delete comment"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-gray-800">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
