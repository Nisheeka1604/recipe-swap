import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import RecipeCard from '../components/RecipeCard';

// Mock recipe data for testing
const mockRecipe = {
  id: 'test-recipe-1',
  title: 'Delicious Pasta Carbonara',
  description: 'A classic Italian pasta dish with eggs, cheese, pancetta, and black pepper.',
  prep_time: 10,
  cook_time: 15,
  servings: 4,
  difficulty: 'medium',
  cuisine: 'italian',
  ingredients: [
    '400g spaghetti',
    '200g pancetta or guanciale, diced',
    '4 large eggs',
    '50g pecorino cheese, grated',
    '50g parmesan, grated',
    'Freshly ground black pepper',
    'Salt',
    '2 cloves garlic, peeled'
  ],
  instructions: [
    {
      title: 'Cook the pasta',
      description: 'Bring a large pot of salted water to boil and cook the spaghetti according to package instructions until al dente.'
    },
    {
      title: 'Cook the pancetta',
      description: 'While the pasta is cooking, fry the pancetta in a large pan until crispy. Add the garlic cloves to infuse the fat, then remove them before serving.'
    },
    {
      title: 'Prepare the sauce',
      description: 'In a bowl, whisk together the eggs, grated cheeses, and plenty of black pepper.'
    },
    {
      title: 'Combine everything',
      description: 'Drain the pasta, reserving a cup of the cooking water. Add the hot pasta to the pancetta, then quickly mix in the egg and cheese mixture. Add a splash of the cooking water to create a creamy sauce. Serve immediately with extra grated cheese and black pepper.'
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profiles: {
    id: 'user-1',
    username: 'chefitaliano',
    avatar_url: 'https://i.pravatar.cc/150?img=32'
  },
  media: [
    { url: 'https://images.unsplash.com/photo-1612874742237-6526229898-c2c1dcafe197?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', media_type: 'image', position: 1 },
    { url: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', media_type: 'image', position: 2 }
  ],
  likes: [],
  like_count: 42
};

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState('Connecting to Supabase...');
  const [testRecipe, setTestRecipe] = useState(mockRecipe);
  
  // Test Supabase connection
  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        
        if (error) throw error;
        
        setConnectionStatus('✅ Successfully connected to Supabase!');
        console.log('Connection test successful!', data);
      } catch (error) {
        setConnectionStatus(`❌ Error connecting to Supabase: ${error.message}`);
        console.error('Connection test failed:', error);
      }
    }
    
    testConnection();
  }, []);
  
  // Mock like handler
  const handleLike = (recipeId, liked) => {
    console.log(`${liked ? 'Liked' : 'Unliked'} recipe ${recipeId}`);
    setTestRecipe(prev => ({
      ...prev,
      like_count: liked ? prev.like_count + 1 : Math.max(0, prev.like_count - 1)
    }));
  };
  
  // Mock save handler
  const handleSave = (recipeId, saved) => {
    console.log(`${saved ? 'Saved' : 'Unsaved'} recipe ${recipeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Recipe Swap - Component Tests</h1>
        
        {/* Connection Status */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Supabase Connection</h2>
          <p className={connectionStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>
            {connectionStatus}
          </p>
        </div>
        
        {/* RecipeCard Test */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">RecipeCard Component</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Test with mock data */}
            <RecipeCard 
              recipe={testRecipe} 
              isLiked={false}
              isSaved={false}
              onLike={handleLike}
              onSave={handleSave}
            />
            
            {/* Test with minimal data */}
            <RecipeCard 
              recipe={{
                id: 'minimal-recipe',
                title: 'Simple Salad',
                description: 'Just a simple salad',
                created_at: new Date().toISOString(),
                profiles: {
                  username: 'healthyeater',
                  avatar_url: 'https://i.pravatar.cc/150?img=45'
                },
                like_count: 5
              }}
              isLiked={true}
              isSaved={true}
              onLike={handleLike}
              onSave={handleSave}
            />
          </div>
        </div>
        
        {/* RecipeFeed Test (simplified) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">RecipeFeed Component</h2>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="mb-4">The RecipeFeed component will be tested separately as it requires more setup.</p>
            <p>For now, check the console for any errors when the page loads.</p>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-2">Testing Instructions</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Check the Supabase connection status above</li>
            <li>Verify that the RecipeCard components render correctly</li>
            <li>Test the like and save buttons (check console for output)</li>
            <li>Check the browser console for any errors</li>
          </ol>
          
          <div className="mt-4 p-4 bg-white rounded border border-blue-100">
            <h3 className="font-medium mb-2">Expected Console Output:</h3>
            <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
              Connection test successful! []
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
