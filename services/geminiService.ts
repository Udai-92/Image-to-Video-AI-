
// Fix: Add GenerateVideosOperation to the import statement.
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject('FileReader did not return a string.');
      }
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Fix: Update pollOperation to be type-safe for video operations by using GenerateVideosOperation type.
const pollOperation = async (
  ai: GoogleGenAI,
  operation: GenerateVideosOperation,
  onProgress: (message: string) => void
): Promise<GenerateVideosOperation> => {
  let currentOperation = operation;
  const progressMessages = [
    "Warming up the AI generators...",
    "Analyzing image composition...",
    "Dreaming up video frames...",
    "Stitching scenes together...",
    "Applying cinematic effects...",
    "Rendering the final cut...",
    "Almost there, adding final touches...",
  ];
  let messageIndex = 0;

  while (!currentOperation.done) {
    onProgress(progressMessages[messageIndex % progressMessages.length]);
    messageIndex++;
    await new Promise(resolve => setTimeout(resolve, 10000));
    try {
        currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
    } catch(e) {
        console.error("Polling failed", e);
        // Continue polling even if one check fails
    }
  }
  return currentOperation;
};

export const generateVideoFromImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  onProgress: (message: string) => void
): Promise<Blob> => {
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please ensure the API_KEY environment variable is set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  onProgress("Initializing video generation...");
  let operation = await ai.models.generateVideos({
    model: 'veo-2.0-generate-001',
    prompt,
    image: {
      imageBytes: base64Image,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
    }
  });

  onProgress("Video generation started. This may take a few minutes.");
  const completedOperation = await pollOperation(ai, operation, onProgress);

  const downloadLink = completedOperation.response?.generatedVideos?.[0]?.video?.uri;

  if (!downloadLink) {
    console.error("API Response:", completedOperation);
    throw new Error("Video generation failed or did not return a valid download link.");
  }

  onProgress("Downloading generated video...");
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.statusText}`);
  }

  const videoBlob = await videoResponse.blob();
  return videoBlob;
};
