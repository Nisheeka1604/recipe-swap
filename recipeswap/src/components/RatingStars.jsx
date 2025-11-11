import { useState, useEffect } from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const RatingStars = ({ recipeId, userId, readOnly = false, size = 20, onRatingChange }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's existing rating
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ratings')
          .select('rating')
          .eq('recipe_id', recipeId)
          .eq('user_id', userId)
          .single();

        if (data) {
          setUserRating(data.rating);
          setRating(data.rating);
        }
      } catch (error) {
        console.error('Error fetching user rating:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRating();
  }, [recipeId, userId]);

  // Fetch average rating
  useEffect(() => {
    const fetchAverageRating = async () => {
      try {
        const { data, error } = await supabase
          .from('recipe_ratings')
          .select('average_rating, total_ratings')
          .eq('recipe_id', recipeId)
          .single();

        if (data && !readOnly) {
          setRating(data.average_rating || 0);
        }
      } catch (error) {
        console.error('Error fetching average rating:', error);
      }
    };

    if (readOnly || !userId) {
      fetchAverageRating();
    }
  }, [recipeId, readOnly, userId]);

  const handleRating = async (newRating) => {
    if (readOnly || !userId) return;

    try {
      const { error } = await supabase.rpc('upsert_rating', {
        p_recipe_id: recipeId,
        p_user_id: userId,
        p_rating: newRating
      });

      if (error) throw error;

      setUserRating(newRating);
      setRating(newRating);
      if (onRatingChange) onRatingChange(newRating);
    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  if (isLoading && !readOnly) {
    return <div className="flex">Loading...</div>;
  }

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const ratingValue = readOnly ? rating : (hover || userRating || hover);
        
        return (
          <button
            key={star}
            type="button"
            className={`${!readOnly ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => handleRating(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            disabled={readOnly}
            aria-label={`Rate ${star} out of 5`}
          >
            {star <= ratingValue ? (
              <FaStar 
                className="text-yellow-400" 
                size={size} 
              />
            ) : star - 0.5 <= ratingValue ? (
              <FaStarHalfAlt 
                className="text-yellow-400" 
                size={size} 
              />
            ) : (
              <FaRegStar 
                className="text-gray-300" 
                size={size} 
              />
            )}
          </button>
        );
      })}
      {readOnly && rating > 0 && (
        <span className="ml-2 text-sm text-gray-600">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
};

export default RatingStars;
