import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from './RecipeCard';

const PAGE_SIZE = 10; // Number of recipes to load per page

export default function RecipeFeed({ userId = null }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [savedRecipes, setSavedRecipes] = useState(new Set());
  const [likedRecipes, setLikedRecipes] = useState(new Set());
  const observer = useRef();
  const loadingRef = useRef(false);

  // Fetch user's saved and liked recipes
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch saved recipes
    const { data: saved } = await supabase
      .from('saved_recipes')
      .select('recipe_id')
      .eq('user_id', user.id);

    if (saved) {
      setSavedRecipes(new Set(saved.map(item => item.recipe_id)));
    }

    // Fetch liked recipes
    const { data: liked } = await supabase
      .from('likes')
      .select('recipe_id')
      .eq('user_id', user.id);

    if (liked) {
      setLikedRecipes(new Set(liked.map(item => item.recipe_id)));
    }
  }, []);

  // Fetch recipes with pagination
  const fetchRecipes = useCallback(async () => {
    if (loadingRef.current) return;
    
    setLoading(true);
    loadingRef.current = true;
    
    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          profiles (id, username, avatar_url),
          recipe_media (url, media_type, position),
          likes (id)
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // If user ID is provided, filter by user
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Format recipes with like count and media
      const formattedRecipes = data.map(recipe => ({
        ...recipe,
        like_count: recipe.likes?.length || 0,
        media: recipe.recipe_media || []
      }));

      setRecipes(prev => (page === 0 ? formattedRecipes : [...prev, ...formattedRecipes]));
      setHasMore(data.length === PAGE_SIZE);
      setInitialLoad(false);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, userId]);

  // Handle like action
  const handleLike = async (recipeId, liked) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (liked) {
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, recipe_id: recipeId }]);
          
        if (error) throw error;
        
        // Update local state
        setLikedRecipes(prev => new Set([...prev, recipeId]));
        
        // Update recipe like count
        setRecipes(prev => 
          prev.map(recipe => 
            recipe.id === recipeId 
              ? { ...recipe, like_count: (recipe.like_count || 0) + 1 }
              : recipe
          )
        );
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);
          
        if (error) throw error;
        
        // Update local state
        setLikedRecipes(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
        
        // Update recipe like count
        setRecipes(prev => 
          prev.map(recipe => 
            recipe.id === recipeId 
              ? { ...recipe, like_count: Math.max(0, (recipe.like_count || 1) - 1) }
              : recipe
          )
        );
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  // Handle save action
  const handleSave = async (recipeId, saved) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (saved) {
        const { error } = await supabase
          .from('saved_recipes')
          .insert([{ user_id: user.id, recipe_id: recipeId }]);
          
        if (error) throw error;
        
        // Update local state
        setSavedRecipes(prev => new Set([...prev, recipeId]));
      } else {
        const { error } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);
          
        if (error) throw error;
        
        // Update local state
        setSavedRecipes(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error updating saved status:', error);
    }
  };

  // Set up intersection observer for infinite scroll
  const lastRecipeRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch recipes when page or filters change
  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Skeleton loader
  const SkeletonLoader = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 rounded-lg overflow-hidden">
            <div className="pb-[75%] bg-gray-300"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // No results message
  if (!initialLoad && !loading && recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No recipes found</h3>
        <p className="mt-1 text-gray-500">
          {userId ? 'This user has not posted any recipes yet.' : 'Be the first to share a recipe!'}
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {initialLoad ? (
        <SkeletonLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe, index) => (
            <div 
              key={recipe.id} 
              ref={index === recipes.length - 1 ? lastRecipeRef : null}
            >
              <RecipeCard
                recipe={recipe}
                isLiked={likedRecipes.has(recipe.id)}
                isSaved={savedRecipes.has(recipe.id)}
                onLike={handleLike}
                onSave={handleSave}
              />
            </div>
          ))}
        </div>
      )}
      
      {loading && !initialLoad && (
        <div className="mt-8">
          <SkeletonLoader />
        </div>
      )}
      
      {!hasMore && recipes.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
}
