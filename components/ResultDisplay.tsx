import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Volume2, VolumeX, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { AnalysisResult } from '../types';
import { generateSpeech, decodeAudioData } from '../services/geminiService';

interface ResultDisplayProps {
  result: AnalysisResult | null;
  loading: boolean;
  title?: string;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, title = "Analysis Result" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Cleanup audio context on unmount or result change
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [result]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignore error if already stopped
      }
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayTTS = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!result?.text) return;

    setIsGeneratingAudio(true);
    try {
      // Create new AudioContext if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000, 
        });
      }

      // Generate speech
      // We truncate text if it's too long to prevent massive generation times for this demo
      // A limit of ~2000 chars is reasonable for a quick demo turn
      const textToRead = result.text.length > 2000 ? result.text.substring(0, 2000) + "..." : result.text;
      
      const base64Audio = await generateSpeech(textToRead);

      if (base64Audio && audioContextRef.current) {
        const audioBuffer = await decodeAudioData(base64Audio, audioContextRef.current);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
            setIsPlaying(false);
            audioSourceRef.current = null;
        };

        source.start(0);
        audioSourceRef.current = source;
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to play TTS", error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-slate-400">
         <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
         <p className="animate-pulse font-medium">Analyzing content with Gemini...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p>Your results will appear here</p>
      </div>
    );
  }

  // Extract links from grounding chunks
  const webLinks = result.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web?.uri)
    .map(chunk => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri
    })) || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <button
          onClick={handlePlayTTS}
          disabled={isGeneratingAudio}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            isPlaying 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          } ${isGeneratingAudio ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isGeneratingAudio ? (
             <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
          {isPlaying ? 'Stop' : 'Read Aloud'}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-slate prose-sm md:prose-base max-w-none">
          <ReactMarkdown>{result.text}</ReactMarkdown>
        </div>

        {webLinks.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Sources & Citations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {webLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-sm text-blue-600 truncate"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{link.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;