import React, { useState, useRef } from 'react';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';
import ResultDisplay from './ResultDisplay';
import { AnalysisResult, Course } from '../types';

interface DocTutorProps {
  course: Course;
}

const DocTutor: React.FC<DocTutorProps> = ({ course }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (activeTab === 'text' && !inputText.trim()) return;
    if (activeTab === 'file' && !file) return;

    setLoading(true);
    setError(null);

    try {
      let base64Data: string | null = null;
      let mimeType: string | null = null;
      let textContent: string | null = null;

      if (activeTab === 'file' && file) {
        base64Data = await fileToBase64(file);
        mimeType = file.type;
      } else {
        textContent = inputText;
      }

      const prompt = "Analyze this content for a student. Create a study guide including: 1. Main Thesis 2. Key Arguments/Points 3. Vocabulary List 4. Quiz Questions (with answers at the bottom).";
      
      const analysis = await analyzeDocument(base64Data, mimeType, textContent, prompt, `${course.title}: ${course.description}`);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to analyze document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Document Tutor
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Paste text or upload a document related to {course.title} to generate study guides, quizzes, and summaries.
          </p>

          <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button 
              onClick={() => { setActiveTab('text'); setFile(null); setError(null); }}
              className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'text' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Paste Text
              {activeTab === 'text' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600"></div>}
            </button>
            <button 
              onClick={() => { setActiveTab('file'); setInputText(''); setError(null); }}
              className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'file' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upload File
              {activeTab === 'file' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600"></div>}
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            {activeTab === 'text' ? (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your article, essay, or notes here..."
                className="w-full flex-1 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-sm leading-relaxed mb-4"
              />
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group mb-4"
              >
                <input 
                  type="file" 
                  accept="application/pdf,image/png,image/jpeg,text/plain" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-white transition-colors">
                   <Upload className="w-6 h-6 text-slate-500 group-hover:text-orange-500" />
                </div>
                {file ? (
                   <div className="text-center">
                      <p className="font-medium text-orange-600">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </div>
                ) : (
                  <>
                    <p className="font-medium text-slate-700">Click to upload document</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, TXT</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || (activeTab === 'text' && !inputText) || (activeTab === 'file' && !file)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Analyzing...' : 'Generate Study Guide'}
            </button>
          </div>
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultDisplay result={result} loading={loading} title="Study Guide" />
      </div>
    </div>
  );
};

export default DocTutor;