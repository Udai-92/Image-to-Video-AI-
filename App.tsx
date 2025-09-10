
import React, { useState, useCallback, ChangeEvent } from 'react';
import { AppState } from './types';
import { generateVideoFromImage, fileToBase64 } from './services/geminiService';

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-violet-400"></div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImagePreviewUrl(previewUrl);
        setError(null);
      } else {
        setError('Please upload a valid image file (e.g., PNG, JPG, WEBP).');
        setImageFile(null);
        setImagePreviewUrl(null);
      }
    }
  };

  const handleGenerateVideo = useCallback(async () => {
    if (!imageFile || !prompt) {
      setError('Please upload an image and provide a prompt.');
      return;
    }

    setAppState(AppState.GENERATING);
    setError(null);
    setLoadingMessage('Preparing your image...');

    try {
      const base64Image = await fileToBase64(imageFile);
      const videoBlob = await generateVideoFromImage(
        base64Image,
        imageFile.type,
        prompt,
        setLoadingMessage
      );

      const videoUrl = URL.createObjectURL(videoBlob);
      setGeneratedVideoUrl(videoUrl);
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred during video generation.');
      setAppState(AppState.ERROR);
    }
  }, [imageFile, prompt]);

  const resetState = () => {
    setAppState(AppState.IDLE);
    setImageFile(null);
    setImagePreviewUrl(null);
    setPrompt('');
    setGeneratedVideoUrl(null);
    setError(null);
    setLoadingMessage('');
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.GENERATING:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 h-full">
            <LoadingSpinner />
            <p className="mt-6 text-xl font-medium text-violet-300">Generating Your Video</p>
            <p className="mt-2 text-gray-400">{loadingMessage}</p>
          </div>
        );
      case AppState.SUCCESS:
        return (
          <div className="p-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Video Generated Successfully!</h2>
            {generatedVideoUrl && (
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                className="w-full max-w-2xl rounded-lg shadow-lg border-2 border-violet-500"
              />
            )}
            <button
              onClick={resetState}
              className="mt-6 bg-violet-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-violet-700 transition-colors duration-300"
            >
              Create Another Video
            </button>
          </div>
        );
      case AppState.ERROR:
        return (
          <div className="p-6 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
            <p className="text-gray-300 bg-red-900/50 p-4 rounded-md">{error}</p>
            <button
              onClick={resetState}
              className="mt-6 bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        );
      case AppState.IDLE:
      default:
        return (
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">1. Upload Image</h3>
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-violet-400 transition-colors duration-300"
                >
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" className="mx-auto max-h-48 rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <UploadIcon className="w-12 h-12 mb-2" />
                      <span className="font-semibold">Click to upload</span>
                      <p className="text-xs">PNG, JPG, GIF, WEBP</p>
                    </div>
                  )}
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*"/>
                </label>
              </div>
              <div className="flex flex-col space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">2. Describe the Video</h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A cinematic shot of the car driving through a neon-lit city at night, rain on the ground..."
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            <div className="mt-8 text-center">
              <button
                onClick={handleGenerateVideo}
                disabled={!imageFile || !prompt}
                className="bg-violet-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-violet-700 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105"
              >
                Generate Video
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Image to Video AI
            </span>
          </h1>
          <p className="text-gray-400 mt-2">Bring your images to life with the power of generative AI.</p>
        </header>
        <main className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden min-h-[400px] flex flex-col justify-center">
            {renderContent()}
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
