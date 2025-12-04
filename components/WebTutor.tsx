import React, { useState } from 'react';
import { Globe, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { researchWebTopic } from '../services/geminiService';
import ResultDisplay from './ResultDisplay';
import { AnalysisResult, Course } from '../types';

interface WebTutorProps {
  course: Course;
}

const WebTutor: React.FC<WebTutorProps> = ({ course }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await researchWebTopic(query, `${course.title}: ${course.description}`);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to research topic.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    `Key concepts in ${course.title}`,
    `Recent news related to ${course.title}`,
    "Glossary of terms",
    "Study resources and practice problems"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            Web Research
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter a topic or question about {course.title}. Gemini will browse the web to create a comprehensive guide with sources.
          </p>

          <form onSubmit={handleSearch} className="relative mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask about ${course.title}...`}
              className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 p-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {!result && !loading && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suggested Searches</p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); handleSearch(); }} 
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-between group"
                  >
                    <span className="text-slate-600 group-hover:text-green-700 text-sm">{s}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-green-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultDisplay result={result} loading={loading} title="Research Report" />
      </div>
    </div>
  );
};

export default WebTutor;