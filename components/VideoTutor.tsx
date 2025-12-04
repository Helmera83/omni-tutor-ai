import React, { useState, useRef } from 'react';
import { Upload, Video, AlertCircle } from 'lucide-react';
import { analyzeVideo } from '../services/geminiService';
import ResultDisplay from './ResultDisplay';
import { AnalysisResult, Course } from '../types';

interface VideoTutorProps {
  course: Course;
}

const VideoTutor: React.FC<VideoTutorProps> = ({ course }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB Limit for client-side demo
        setError("File size is too large for this browser-based demo. Please keep it under 50MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // remove data:video/mp4;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve({
          data: base64Data,
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { data, mimeType } = await fileToGenerativePart(file);
      const prompt = "Watch this video carefully. Provide a detailed educational summary. Structure the response with an Introduction, Key Concepts Explained, Important Terminology, and a Conclusion. If there is spoken content, highlight the main speakers points.";
      const analysis = await analyzeVideo(data, mimeType, prompt, `${course.title}: ${course.description}`);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to analyze video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Video Analysis
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Upload a short educational video for {course.title} to get an instant AI-powered summary and breakdown.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-white transition-colors">
               <Upload className="w-6 h-6 text-slate-500 group-hover:text-blue-500" />
            </div>
            <p className="font-medium text-slate-700">Click to upload video</p>
            <p className="text-xs text-slate-400 mt-1">MP4, WebM (Max 50MB)</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {previewUrl && (
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700 mb-2">Preview</p>
              <video 
                src={previewUrl} 
                controls 
                className="w-full rounded-lg bg-black aspect-video"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Analyzing Video...' : 'Analyze Video'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultDisplay result={result} loading={loading} title="Video Summary" />
      </div>
    </div>
  );
};

export default VideoTutor;