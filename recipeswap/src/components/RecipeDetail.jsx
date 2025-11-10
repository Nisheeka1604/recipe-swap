import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaClock, FaUtensils, FaUser, FaComment } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetchRecipe();
    fetchMedia();
    checkIfLiked();
    checkIfSaved();
    fetchComments();
    getCurrentUser();
    
    // Set up real-time subscription for comments
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
          if (payload.eventType === 'INSERT') {
            setComments(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => 
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          profiles (id, username, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setRecipe(data);
      setLikeCount(data.like_count || 0);
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

  const checkIfLiked = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .single();

    if (!error && data) {
      setIsLiked(true);
    }
  };

  const checkIfSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .single();

    if (!error && data) {
      setIsSaved(true);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (id, username, avatar_url)
      `)
      .eq('recipe_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', id);

      if (!error) {
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert([{ user_id: user.id, recipe_id: id }]);

      if (!error) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isSaved) {
      // Unsave
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', id);

      if (!error) {
        setIsSaved(false);
      }
    } else {
      // Save
      const { error } = await supabase
        .from('saved_recipes')
        .insert([{ user_id: user.id, recipe_id: id }]);

      if (!error) {
        setIsSaved(true);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const { error } = await supabase
      .from('comments')
      .insert([
        { 
          user_id: user.id, 
          recipe_id: id, 
          content: newComment.trim() 
        }
      ]);

    if (!error) {
      setNewComment('');
    }
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
