import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';

export default function RecipeForm({ recipe = null }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [prepTime, setPrepTime] = useState(recipe?.prep_time || '');
  const [cookTime, setCookTime] = useState(recipe?.cook_time || '');
  const [servings, setServings] = useState(recipe?.servings || 1);
  const [difficulty, setDifficulty] = useState(recipe?.difficulty || 'medium');
  const [cuisine, setCuisine] = useState(recipe?.cuisine || '');
  const [images, setImages] = useState(recipe?.images || []);
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length > 0 
      ? recipe.ingredients 
      : [{ id: Date.now(), amount: '', unit: '', name: '' }]
  );
  const [instructions, setInstructions] = useState(
    recipe?.instructions?.length > 0 
      ? recipe.instructions 
      : [{ id: Date.now(), step: '' }]
  );
  const [tags, setTags] = useState(recipe?.tags?.join(', ') || '');

  // Handle image upload
  const handleImageUpload = (file) => {
    if (!file) return;
    
    setImages(prev => {
      // If editing, replace the first image, otherwise add to the array
      if (recipe?.images?.length > 0) {
        return [file, ...prev.slice(1)];
      }
      return [file, ...prev];
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!title.trim()) {
        throw new Error('Recipe title is required');
      }

      if (ingredients.length === 0) {
        throw new Error('At least one ingredient is required');
      }

      if (instructions.length === 0) {
        throw new Error('At least one instruction step is required');
      }

      // Prepare recipe data
      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        prep_time: parseInt(prepTime) || 0,
        cook_time: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 1,
        difficulty,
        cuisine: cuisine.trim(),
        ingredients: ingredients.map(ing => ({
          ...ing,
          amount: parseFloat(ing.amount) || 0,
        })),
        instructions: instructions.map((inst, index) => ({
          ...inst,
          step_number: index + 1,
        })),
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        // Images will be handled separately
      };

      let result;
      
      if (recipe) {
        // Update existing recipe
        const { data, error: updateError } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        result = data;
      } else {
        // Create new recipe
        const { data, error: insertError } = await supabase
          .from('recipes')
          .insert([{ ...recipeData, user_id: (await supabase.auth.getUser()).data.user.id }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        result = data;
      }

      // Handle image uploads if there are new images
      if (images.length > 0 && images[0]?.file) {
        const uploadedImages = [];
        
        for (const img of images) {
          if (img.file) {
            const fileExt = img.name.split('.').pop();
            const fileName = `${result.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `recipes/${fileName}`;

            // Upload the file
            const { error: uploadError } = await supabase.storage
              .from('recipe-images')
              .upload(filePath, img.file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('recipe-images')
              .getPublicUrl(filePath);

            uploadedImages.push({
              url: publicUrl,
              path: filePath,
              is_primary: uploadedImages.length === 0, // First image is primary
            });
          } else if (img.url) {
            // Keep existing images
            uploadedImages.push({
              url: img.url,
              path: img.path,
              is_primary: img.is_primary,
            });
          }
        }

        // Update recipe with image URLs
        await supabase
          .from('recipes')
          .update({ images: uploadedImages })
          .eq('id', result.id);
      }

      // Redirect to the recipe page
      navigate(`/recipe/${result.id}`);
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      setError(error.message || 'An error occurred while saving the recipe');
    } finally {
      setLoading(false);
    }
  };

  // Handle ingredient changes
  const handleIngredientChange = (id, field, value) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now(), amount: '', unit: '', name: '' }]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  // Handle instruction changes
  const handleInstructionChange = (id, value) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, step: value } : inst
    ));
  };

  const addInstruction = () => {
    setInstructions([...instructions, { id: Date.now(), step: '' }]);
  };

  const removeInstruction = (id) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter(inst => inst.id !== id));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Images */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recipe Images</h3>
        <ImageUpload 
          onUpload={handleImageUpload} 
          previewUrl={images[0]?.url}
        />
        <p className="mt-2 text-sm text-gray-500">
          Add a high-quality photo that shows your finished dish.
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Recipe Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., Creamy Garlic Pasta"
              required
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Share the story behind your recipe or what makes it special..."
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">
              Prep Time (minutes)
            </label>
            <input
              type="number"
              id="prepTime"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700">
              Cook Time (minutes)
            </label>
            <input
              type="number"
              id="cookTime"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
              Servings
            </label>
            <input
              type="number"
              id="servings"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
              Difficulty
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700">
              Cuisine
            </label>
            <input
              type="text"
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., Italian, Mexican, Indian"
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., vegetarian, gluten-free, quick-meal"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate tags with commas
            </p>
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Ingredients *</h3>
          <button
            type="button"
            onClick={addIngredient}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Ingredient
          </button>
        </div>
        
        <div className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="flex items-start space-x-2">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="Qty"
                    value={ingredient.amount}
                    onChange={(e) => handleIngredientChange(ingredient.id, 'amount', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Unit (e.g., cup, tbsp)"
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(ingredient.id, 'unit', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(ingredient.id, 'name', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeIngredient(ingredient.id)}
                className="text-gray-400 hover:text-red-500"
                disabled={ingredients.length <= 1}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Instructions *</h3>
          <button
            type="button"
            onClick={addInstruction}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Step
          </button>
        </div>
        
        <div className="space-y-4">
          {instructions.map((instruction, index) => (
            <div key={instruction.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <textarea
                  rows={3}
                  placeholder={`Step ${index + 1}...`}
                  value={instruction.step}
                  onChange={(e) => handleInstructionChange(instruction.id, e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeInstruction(instruction.id)}
                className="text-gray-400 hover:text-red-500 mt-2"
                disabled={instructions.length <= 1}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {recipe ? 'Updating...' : 'Creating...'}
            </>
          ) : recipe ? 'Update Recipe' : 'Create Recipe'}
        </button>
      </div>
    </form>
  );
}
