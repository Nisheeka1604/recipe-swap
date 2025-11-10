import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaRegBookmark, FaBookmark, FaClock, FaUtensils } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

const RecipeCard = ({ recipe, isLiked: initialIsLiked, isSaved: initialIsSaved, onLike, onSave }) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [likeCount, setLikeCount] = useState(recipe.like_count || 0);
  const [isHovered, setIsHovered] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newLikeStatus = !isLiked;
    setIsLiked(newLikeStatus);
    setLikeCount(prev => newLikeStatus ? prev + 1 : prev - 1);
    
    if (onLike) {
      onLike(recipe.id, newLikeStatus);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newSaveStatus = !isSaved;
    setIsSaved(newSaveStatus);
    
    if (onSave) {
      onSave(recipe.id, newSaveStatus);
    }
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const imageUrl = recipe.media?.[0]?.url || 'https://via.placeholder.com/300x200?text=No+Image';
  
  return (
    <Link 
      to={`/recipe/${recipe.id}`}
      className="block rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative pb-[75%] bg-gray-100">
        <img 
          src={imageUrl} 
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-2 right-2 flex space-x-2">
          <button 
            onClick={handleSave}
            className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
            aria-label={isSaved ? 'Unsave recipe' : 'Save recipe'}
          >
            {isSaved ? 
              <FaBookmark className="text-yellow-500" /> : 
              <FaRegBookmark className="text-gray-700" />}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-2">{recipe.title}</h3>
          <button 
            onClick={handleLike}
            className="flex items-center space-x-1 text-red-500"
            aria-label={isLiked ? 'Unlike recipe' : 'Like recipe'}
          >
            {isLiked ? <FaHeart /> : <FaRegHeart />}
            <span className="text-sm">{likeCount}</span>
          </button>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 space-x-4">
          {totalTime > 0 && (
            <div className="flex items-center">
              <FaClock className="mr-1" />
              <span>{totalTime} min</span>
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center">
              <FaUtensils className="mr-1" />
              <span className="capitalize">{recipe.difficulty}</span>
            </div>
          )}
        </div>
        
        {recipe.cuisine && (
          <div className="mt-2">
            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {recipe.cuisine}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default RecipeCard;
