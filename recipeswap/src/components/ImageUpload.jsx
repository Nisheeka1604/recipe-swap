import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ImageUpload({ onUpload, folder = 'recipes', previewUrl = null }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(previewUrl);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      setProgress(0);
      
      const file = event.target.files[0];
      if (!file) return;

      // Set preview
      const filePreview = URL.createObjectURL(file);
      setPreview(filePreview);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      // Call the callback with the file path and URL
      if (onUpload) {
        onUpload({
          path: filePath,
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-1 text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload an image</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>
          
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                if (onUpload) onUpload(null);
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              disabled={uploading}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex-1">
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {uploading ? 'Uploading...' : 'Choose Image'}
          </label>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          
          {uploading && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          
          {preview && !uploading && (
            <p className="mt-2 text-xs text-gray-500">
              Click the image to change or remove
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
