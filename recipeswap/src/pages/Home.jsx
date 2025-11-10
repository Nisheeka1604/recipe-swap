import { useState } from 'react';
import RecipeFeed from '../components/RecipeFeed';
import { FaSearch, FaFilter } from 'react-icons/fa';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cuisine: '',
    difficulty: '',
    maxTime: '',
  });

  const handleSearch = (e) => {
    e.preventDefault();
    // Search functionality will be implemented in the RecipeFeed component
    console.log('Searching for:', { searchQuery, ...filters });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Discover Amazing Recipes</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Find and share delicious recipes from around the world. Cook, share, and enjoy!
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for recipes..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaFilter className="mr-2" />
              Filters
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Search
            </button>
          </div>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Filter Recipes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine
                </label>
                <select
                  id="cuisine"
                  value={filters.cuisine}
                  onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                >
                  <option value="">All Cuisines</option>
                  <option value="italian">Italian</option>
                  <option value="mexican">Mexican</option>
                  <option value="indian">Indian</option>
                  <option value="chinese">Chinese</option>
                  <option value="japanese">Japanese</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="american">American</option>
                  <option value="thai">Thai</option>
                  <option value="french">French</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                >
                  <option value="">Any Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="maxTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Cooking Time (min)
                </label>
                <select
                  id="maxTime"
                  value={filters.maxTime}
                  onChange={(e) => setFilters({ ...filters, maxTime: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                >
                  <option value="">Any Time</option>
                  <option value="15">Under 15 min</option>
                  <option value="30">Under 30 min</option>
                  <option value="60">Under 1 hour</option>
                  <option value="120">Under 2 hours</option>
                  <option value="180">Under 3 hours</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    cuisine: '',
                    difficulty: '',
                    maxTime: '',
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trending Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
          <a href="#" className="text-blue-600 hover:underline">View all</a>
        </div>
        <RecipeFeed />
      </section>

      {/* Categories Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'Breakfast', emoji: '🍳' },
            { name: 'Lunch', emoji: '🥗' },
            { name: 'Dinner', emoji: '🍲' },
            { name: 'Dessert', emoji: '🍰' },
            { name: 'Vegan', emoji: '🌱' },
            { name: 'Quick Meals', emoji: '⚡' },
          ].map((category) => (
            <a
              key={category.name}
              href="#"
              className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <span className="text-3xl mb-2" role="img" aria-label={category.name}>
                {category.emoji}
              </span>
              <span className="font-medium text-gray-900">{category.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Popular Chefs Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Popular Chefs</h2>
          <a href="#" className="text-blue-600 hover:underline">View all</a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <a
              key={i}
              href="#"
              className="flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gray-200 mb-2 overflow-hidden">
                <img 
                  src={`https://i.pravatar.cc/150?img=${i + 10}`} 
                  alt={`Chef ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium text-gray-900">Chef {['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'][i-1]}</span>
              <span className="text-sm text-gray-500">{['Italian', 'Mexican', 'Japanese', 'Desserts', 'Vegan', 'BBQ'][i-1]}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
