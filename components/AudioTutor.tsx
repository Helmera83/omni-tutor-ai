import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, StopCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { analyzeAudio } from '../services/geminiService';
import ResultDisplay from './ResultDisplay';
import { AnalysisResult, Course } from '../types';

interface AudioTutorProps {
  course: Course;
}

const AudioTutor: React.FC<AudioTutorProps> = ({ course }) => {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
      setResult(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setResult(null);
      setError(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setError(null);

    try {
      const base64Data = await blobToBase64(audioBlob);
      // Determine mime type (default to webm for recording, or file type for upload)
      const mimeType = audioBlob.type || 'audio/webm';
      
      const prompt = "Transcribe this audio accurately. Then, provide a bulleted summary of the key takeaways and any action items mentioned.";
      const analysis = await analyzeAudio(base64Data, mimeType, prompt, `${course.title}: ${course.description}`);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-500" />
            Audio Transcription
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Record a lecture or upload audio for {course.title} to get a transcription and study notes.
          </p>

          <div className="flex gap-4 mb-6 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => { setMode('record'); setAudioBlob(null); setResult(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'record' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Record Audio
            </button>
            <button 
              onClick={() => { setMode('upload'); setAudioBlob(null); setResult(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'upload' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upload File
            </button>
          </div>

          {mode === 'record' ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
               {isRecording ? (
                 <div className="flex flex-col items-center animate-pulse">
                   <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
                     <Mic className="w-10 h-10 text-red-500" />
                   </div>
                   <p className="text-2xl font-mono text-slate-800 mb-2">{formatTime(recordingTime)}</p>
                   <p className="text-sm text-red-500 font-medium">Recording...</p>
                   <button 
                     onClick={stopRecording}
                     className="mt-6 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 transition-colors"
                   >
                     <StopCircle className="w-5 h-5" /> Stop Recording
                   </button>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                   <button 
                     onClick={startRecording}
                     className="w-20 h-20 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center mb-4 transition-colors group"
                   >
                     <Mic className="w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform" />
                   </button>
                   <p className="text-sm text-slate-500">Tap to start recording</p>
                 </div>
               )}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all group"
            >
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-white transition-colors">
                 <Upload className="w-6 h-6 text-slate-500 group-hover:text-purple-500" />
              </div>
              <p className="font-medium text-slate-700">Click to upload audio</p>
              <p className="text-xs text-slate-400 mt-1">MP3, WAV, M4A</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="mt-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                <PlayCircle className="w-6 h-6 text-purple-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">Audio captured</p>
                  <p className="text-xs text-slate-400">Ready to transcribe</p>
                </div>
              </div>
              <button
                onClick={handleTranscribe}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Transcribing...' : 'Transcribe Audio'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultDisplay result={result} loading={loading} title="Transcription & Notes" />
      </div>
    </div>
  );
};

export default AudioTutor;