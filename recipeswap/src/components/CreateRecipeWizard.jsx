import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';

export default function CreateRecipeWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Form state
  const [recipe, setRecipe] = useState({
    title: '',
    description: '',
    prepTime: '',
    cookTime: '',
    servings: 1,
    difficulty: 'medium',
    cuisine: '',
    ingredients: [{ id: Date.now(), amount: '', unit: '', name: '' }],
    instructions: [{ id: Date.now(), step: '' }],
    tags: [],
    media: [],
  });

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState({
    ingredientSubstitutions: [],
    cookingTips: [],
    loading: false,
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRecipe(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle media upload
  const handleMediaUpload = (file) => {
    if (!file) return;
    
    setRecipe(prev => ({
      ...prev,
      media: [...prev.media, file]
    }));
  };

  // Handle ingredient changes
  const handleIngredientChange = (id, field, value) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => 
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const addIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { id: Date.now(), amount: '', unit: '', name: '' }
      ]
    }));
  };

  const removeIngredient = (id) => {
    if (recipe.ingredients.length > 1) {
      setRecipe(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter(ing => ing.id !== id)
      }));
    }
  };

  // Handle instruction changes
  const handleInstructionChange = (id, value) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map(inst => 
        inst.id === id ? { ...inst, step: value } : inst
      )
    }));
  };

  const addInstruction = () => {
    setRecipe(prev => ({
      ...prev,
      instructions: [
        ...prev.instructions,
        { id: Date.now(), step: '' }
      ]
    }));
  };

  const removeInstruction = (id) => {
    if (recipe.instructions.length > 1) {
      setRecipe(prev => ({
        ...prev,
        instructions: prev.instructions.filter(inst => inst.id !== id)
      }));
    }
  };

  // Handle tag changes
  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setRecipe(prev => ({
      ...prev,
      tags
    }));
  };

  // Get AI suggestions for recipe
  const getAiSuggestions = async () => {
    try {
      setAiSuggestions(prev => ({ ...prev, loading: true }));
      
      // This is a placeholder - you'll need to implement the actual API call to your AI service
      // const response = await fetch('/api/ai/suggestions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ingredients: recipe.ingredients,
      //     instructions: recipe.instructions
      // })
      // });
      // const data = await response.json();
      
      // Mock response for now
      const mockResponse = {
        ingredientSubstitutions: [
          { original: 'milk', suggestion: 'almond milk', reason: 'Dairy-free alternative' },
          { original: 'sugar', suggestion: 'honey', reason: 'Natural sweetener' }
        ],
        cookingTips: [
          'Let the dough rest for 30 minutes for better texture',
          'Add a pinch of salt to enhance flavors'
        ]
      };
      
      setAiSuggestions({
        ...mockResponse,
        loading: false
      });
      
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setAiSuggestions(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a recipe');
      
      // Upload media files
      const uploadedMedia = [];
      for (const media of recipe.media) {
        const fileExt = media.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `recipes/${fileName}`;
        
        // Upload the file
        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, media);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath);
          
        uploadedMedia.push({
          url: publicUrl,
          path: filePath,
          is_primary: uploadedMedia.length === 0
        });
      }
      
      // Save recipe to database
      const { data, error: insertError } = await supabase
        .from('recipes')
        .insert([{
          user_id: user.id,
          title: recipe.title,
          description: recipe.description,
          prep_time: parseInt(recipe.prepTime) || 0,
          cook_time: parseInt(recipe.cookTime) || 0,
          servings: parseInt(recipe.servings) || 1,
          difficulty: recipe.difficulty,
          cuisine: recipe.cuisine,
          ingredients: recipe.ingredients.map(ing => ({
            ...ing,
            amount: parseFloat(ing.amount) || 0,
          })),
          instructions: recipe.instructions.map((inst, index) => ({
            ...inst,
            step_number: index + 1,
          })),
          tags: recipe.tags,
          images: uploadedMedia,
        }])
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      // Redirect to the new recipe
      navigate(`/recipe/${data.id}`);
      
    } catch (error) {
      console.error('Error creating recipe:', error);
      setError(error.message || 'An error occurred while creating the recipe');
    } finally {
      setLoading(false);
    }
  };

  // Navigation between steps
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Upload Media</h2>
            <p className="text-gray-600">Add photos or videos of your delicious recipe</p>
            
            <div className="mt-6">
              <ImageUpload 
                onUpload={handleMediaUpload} 
                multiple={true}
                maxFiles={5}
              />
              {recipe.media.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {recipe.media.map((file, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRecipe(prev => ({
                            ...prev,
                            media: prev.media.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                disabled={recipe.media.length === 0}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next: Recipe Details
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Recipe Details</h2>
            <p className="text-gray-600">Tell us about your recipe</p>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={recipe.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={recipe.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Tell us about your recipe..."
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">
                  Prep Time (minutes)
                </label>
                <input
                  type="number"
                  id="prepTime"
                  name="prepTime"
                  min="0"
                  value={recipe.prepTime}
                  onChange={handleChange}
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
                  name="cookTime"
                  min="0"
                  value={recipe.cookTime}
                  onChange={handleChange}
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
                  name="servings"
                  min="1"
                  value={recipe.servings}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={recipe.difficulty}
                  onChange={handleChange}
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
                  name="cuisine"
                  value={recipe.cuisine}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., Italian, Mexican, Indian"
                />
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={!recipe.title.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next: Ingredients
              </button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Ingredients</h2>
            <p className="text-gray-600">List all the ingredients needed for your recipe</p>
            
            <div className="space-y-4">
              {recipe.ingredients.map((ingredient, index) => (
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
                    className="text-gray-400 hover:text-red-500 mt-1"
                    disabled={recipe.ingredients.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Ingredient
                </button>
              </div>
              
              {/* AI Suggestions */}
              <div className="mt-8 bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-blue-800">Smart Suggestions</h3>
                  <button
                    type="button"
                    onClick={getAiSuggestions}
                    disabled={aiSuggestions.loading}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {aiSuggestions.loading ? 'Generating...' : 'Get Suggestions'}
                  </button>
                </div>
                
                {aiSuggestions.ingredientSubstitutions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-blue-700">Ingredient Substitutions</h4>
                    <ul className="mt-2 space-y-2">
                      {aiSuggestions.ingredientSubstitutions.map((sub, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-blue-800">
                            <span className="font-medium">{sub.original}</span> → {sub.suggestion} 
                            <span className="text-blue-600">({sub.reason})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {aiSuggestions.cookingTips.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-blue-700">Cooking Tips</h4>
                    <ul className="mt-2 space-y-2">
                      {aiSuggestions.cookingTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-blue-800">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={!recipe.ingredients.some(ing => ing.name.trim() && ing.amount)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next: Instructions
              </button>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Instructions</h2>
            <p className="text-gray-600">Add step-by-step instructions for your recipe</p>
            
            <div className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
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
                    disabled={recipe.instructions.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={addInstruction}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Step
                </button>
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={!recipe.instructions.some(inst => inst.step.trim())}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next: Tags & Publish
              </button>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Tags & Publish</h2>
            <p className="text-gray-600">Add tags to help others find your recipe</p>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={recipe.tags.join(', ')}
                    onChange={handleTagsChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., vegetarian, gluten-free, quick-meal"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Separate tags with commas
                </p>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {recipe.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900">Ready to publish?</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {recipe.media.length > 0 
                    ? 'Your recipe looks great! Ready to share it with the community?'
                    : 'Consider adding some photos to make your recipe more appealing!'}
                </p>
                
                <div className="mt-4 flex items-center">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                    I confirm that this recipe is my own creation and doesn't violate any copyrights.
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  </>
                ) : (
                  'Publish Recipe'
                )}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentStep === 5 ? 'Review & Publish' : `Create a New Recipe (Step ${currentStep} of 4)`}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {currentStep === 1 && 'Start by adding some mouth-watering photos of your dish'}
          {currentStep === 2 && 'Tell us about your recipe'}
          {currentStep === 3 && 'List all the ingredients needed'}
          {currentStep === 4 && 'Add step-by-step instructions'}
          {currentStep === 5 && 'Add some tags and publish your recipe'}
        </p>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round((currentStep / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
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
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
