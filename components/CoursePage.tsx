import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Video, Mic, FileText, Globe, Plus, X, ChevronRight, PlayCircle, LayoutGrid, MessageSquare, Calendar, Trash2, Download, Folder, ChevronDown, ArrowLeft, Sparkles, Clock, MessageSquarePlus, FileUp, Volume2, VolumeX, FileStack, Edit2, Check, MoreVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Course, Message, Material, ChatSession } from '../types';
import { chatWithCourseAgent, analyzeVideo, analyzeAudio, analyzeDocument, researchWebTopic, generateCourseSynthesis, generateSpeech, decodeAudioData, generateChatTitle } from '../services/geminiService';

interface CoursePageProps {
  course: Course;
}

const DEFAULT_FOLDERS = [
  'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 
  'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 
  'Group Project'
];

const CoursePage: React.FC<CoursePageProps> = ({ course }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'overview' | 'materials'>('chat');
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Folder Navigation State
  const [folders, setFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem(`omnitutor_folders_${course.id}`);
    return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
  });
  
  const [currentFolderView, setCurrentFolderView] = useState<string | null>(null);
  
  // Folder Editing State
  const [folderToEdit, setFolderToEdit] = useState<string | null>(null);
  const [editFolderValue, setEditFolderValue] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Course Synthesis State
  const [synthesis, setSynthesis] = useState<string>(() => {
    return localStorage.getItem(`omnitutor_synthesis_${course.id}`) || '';
  });
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);

  // --- Session Management ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const savedSessions = localStorage.getItem(`omnitutor_sessions_${course.id}`);
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      return parsed.sort((a: ChatSession, b: ChatSession) => b.lastModified - a.lastModified);
    }
    const savedOldChat = localStorage.getItem(`omnitutor_chat_${course.id}`);
    if (savedOldChat) {
      const oldMsgs = JSON.parse(savedOldChat);
      return [{
        id: Date.now().toString(),
        title: 'Previous Conversation',
        messages: oldMsgs,
        lastModified: Date.now()
      }];
    }
    return [{
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [{
        id: '1',
        role: 'model',
        content: `Welcome to **${course.title}**. I'm your AI agent. Upload videos, audio, or documents to specific weeks, and I'll analyze them to help you learn!`,
        timestamp: Date.now()
      }],
      lastModified: Date.now()
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
     const savedSessions = localStorage.getItem(`omnitutor_sessions_${course.id}`);
     if (savedSessions) {
       const parsed = JSON.parse(savedSessions);
       if (parsed.length > 0) return parsed[0].id;
     }
     return '';
  });

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Materials State with Persistence
  const [materials, setMaterials] = useState<Material[]>(() => {
    const saved = localStorage.getItem(`omnitutor_materials_${course.id}`);
    const parsed = saved ? JSON.parse(saved) : [];
    // Ensure legacy materials have a valid folder or default to first available
    const defaultFolder = DEFAULT_FOLDERS[0];
    return parsed.map((m: any) => ({ ...m, folder: m.folder || defaultFolder }));
  });

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [targetFolder, setTargetFolder] = useState<string>(folders[0] || 'Uncategorized');

  // Sidebar Accordion State
  const [expandedFolders, setExpandedFolders] = useState<string[]>([folders[0] || '']);

  // Attachment Menu State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Refs for file inputs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Web Search State
  const [showWebModal, setShowWebModal] = useState(false);
  const [webQuery, setWebQuery] = useState('');

  // TTS State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isGeneratingAudioId, setIsGeneratingAudioId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
        stopAudio();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) {}
        audioSourceRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const handlePlayTTS = async (messageId: string, text: string) => {
    if (playingMessageId === messageId) {
        stopAudio();
        return;
    }
    stopAudio();
    setIsGeneratingAudioId(messageId);

    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const cleanText = text.replace(/\*\*/g, '').replace(/##/g, '');
        const base64Audio = await generateSpeech(cleanText);

        if (base64Audio && audioContextRef.current) {
             const audioBuffer = await decodeAudioData(base64Audio, audioContextRef.current);
             const source = audioContextRef.current.createBufferSource();
             source.buffer = audioBuffer;
             source.connect(audioContextRef.current.destination);
             source.onended = () => {
                 setPlayingMessageId(null);
                 audioSourceRef.current = null;
             };
             source.start(0);
             audioSourceRef.current = source;
             setPlayingMessageId(messageId);
        }
    } catch (error) {
        console.error("TTS Error", error);
    } finally {
        setIsGeneratingAudioId(null);
    }
  };

  useEffect(() => {
    localStorage.setItem(`omnitutor_sessions_${course.id}`, JSON.stringify(sessions));
  }, [sessions, course.id]);

  useEffect(() => {
    localStorage.setItem(`omnitutor_materials_${course.id}`, JSON.stringify(materials));
  }, [materials, course.id]);

  useEffect(() => {
    localStorage.setItem(`omnitutor_synthesis_${course.id}`, synthesis);
  }, [synthesis, course.id]);
  
  useEffect(() => {
    localStorage.setItem(`omnitutor_folders_${course.id}`, JSON.stringify(folders));
  }, [folders, course.id]);

  // Ensure target folder is valid if folders change
  useEffect(() => {
    if (folders.length > 0 && !folders.includes(targetFolder)) {
      setTargetFolder(folders[0]);
    }
  }, [folders, targetFolder]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab, activeSessionId]);

  const toggleFolderAccordion = (folder: string) => {
    setExpandedFolders(prev => 
      prev.includes(folder) 
        ? prev.filter(f => f !== folder) 
        : [...prev, folder]
    );
  };

  // --- Folder Management Functions ---

  const handleStartRename = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setEditFolderValue(folder);
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderToEdit || !editFolderValue.trim()) return;
    
    const newName = editFolderValue.trim();
    if (newName === folderToEdit) {
      setFolderToEdit(null);
      return;
    }

    if (folders.includes(newName)) {
      alert("A folder with this name already exists.");
      return;
    }

    // Update folders list
    setFolders(prev => prev.map(f => f === folderToEdit ? newName : f));
    
    // Update materials
    setMaterials(prev => prev.map(m => m.folder === folderToEdit ? { ...m, folder: newName } : m));

    // Update expanded folders state if needed
    setExpandedFolders(prev => prev.map(f => f === folderToEdit ? newName : f));
    
    // Update target folder if needed
    if (targetFolder === folderToEdit) setTargetFolder(newName);

    setFolderToEdit(null);
  };

  const handleDeleteFolder = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent deletion of the last folder
    if (folders.length <= 1) {
      alert("You must have at least one folder. Create a new folder before deleting this one.");
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${folder}" and all its contents? This action cannot be undone.`)) {
       // Remove folder
       setFolders(prev => prev.filter(f => f !== folder));
       // Remove materials in folder
       setMaterials(prev => prev.filter(m => m.folder !== folder));
       // Cleanup expanded state
       setExpandedFolders(prev => prev.filter(f => f !== folder));
       
       // Update targetFolder if it was the deleted folder
       if (targetFolder === folder) {
         const remainingFolders = folders.filter(f => f !== folder);
         if (remainingFolders.length > 0) {
           setTargetFolder(remainingFolders[0]);
         }
       }
       
       // Update currentFolderView if viewing the deleted folder
       if (currentFolderView === folder) {
         setCurrentFolderView(null);
       }
    }
  };

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (folders.includes(newFolderName.trim())) {
      alert("Folder already exists.");
      return;
    }
    setFolders(prev => [...prev, newFolderName.trim()]);
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  // -----------------------------------

  const handleGenerateSynthesis = async () => {
    if (materials.length === 0) {
        alert("Please upload materials first.");
        return;
    }
    setIsGeneratingSynthesis(true);
    try {
        const result = await generateCourseSynthesis(materials, course.title);
        setSynthesis(result);
    } catch (e) {
        alert("Failed to generate synthesis");
    } finally {
        setIsGeneratingSynthesis(false);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      messages: [{
        id: '1',
        role: 'model',
        content: `Hello! I'm ready to help you with **${course.title}**. What's on your mind?`,
        timestamp: Date.now()
      }],
      lastModified: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (window.innerWidth < 1024) setShowHistoryPanel(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
        alert("You must have at least one chat session.");
        return;
    }
    if (confirm("Delete this conversation history?")) {
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (activeSessionId === id) {
            setActiveSessionId(newSessions[0].id);
        }
    }
  };

  const addMaterial = (type: Material['type'], title: string, summary: string, folder: string) => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      type,
      title,
      summary,
      timestamp: Date.now(),
      folder
    };
    
    setMaterials(prev => [newMaterial, ...prev]);
    
    if (!expandedFolders.includes(folder)) {
        setExpandedFolders(prev => [...prev, folder]);
    }

    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'model',
      content: `I have finished analyzing **${title}** (${type}) and saved it to **${folder}**.\n\n**Summary:**\n${summary}\n\nYou can now ask me detailed questions about this content.`,
      timestamp: Date.now()
    };
    
    setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
            return {
                ...s,
                messages: [...s.messages, systemMsg],
                lastModified: Date.now()
            };
        }
        return s;
    }));
  };

  const deleteMaterial = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this material?")) {
      setMaterials(prev => prev.filter(m => m.id !== id));
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

  const processVideo = async (file: File) => {
    // Ensure we have a valid target folder
    const validFolder = folders.includes(targetFolder) ? targetFolder : folders[0];
    if (!validFolder) {
      alert("No folders available. Please create a folder first.");
      return;
    }
    
    setUploading(true);
    setUploadStatus(`Analyzing video for ${validFolder}: ${file.name}...`);
    try {
      const base64 = await fileToBase64(file);
      // Pass full course context (Title + Description) to AI
      const result = await analyzeVideo(
        base64, 
        file.type, 
        "Provide a comprehensive summary of this video for a student.", 
        `${course.title}: ${course.description}`
      );
      addMaterial('video', file.name, result.text, validFolder);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze video.");
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const processAudio = async (file: File) => {
    // Ensure we have a valid target folder
    const validFolder = folders.includes(targetFolder) ? targetFolder : folders[0];
    if (!validFolder) {
      alert("No folders available. Please create a folder first.");
      return;
    }
    
    setUploading(true);
    setUploadStatus(`Transcribing audio for ${validFolder}: ${file.name}...`);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'audio/mp3'; 
      // Pass full course context (Title + Description) to AI
      const result = await analyzeAudio(
        base64, 
        mimeType, 
        "Transcribe and summarize this audio.", 
        `${course.title}: ${course.description}`
      );
      addMaterial('audio', file.name, result.text, validFolder);
    } catch (error) {
      console.error(error);
      alert("Failed to transcribe audio.");
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const processDoc = async (file: File) => {
    // Ensure we have a valid target folder
    const validFolder = folders.includes(targetFolder) ? targetFolder : folders[0];
    if (!validFolder) {
      alert("No folders available. Please create a folder first.");
      return;
    }
    
    setUploading(true);
    setUploadStatus(`Analyzing document for ${validFolder}: ${file.name}...`);
    try {
      const base64 = await fileToBase64(file);
      // Pass full course context (Title + Description) to AI
      const result = await analyzeDocument(
        base64, 
        file.type, 
        null, 
        "Summarize this document and list key concepts.", 
        `${course.title}: ${course.description}`
      );
      addMaterial('document', file.name, result.text, validFolder);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze document.");
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideo(file);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
    setShowAttachMenu(false);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudio(file);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
    setShowAttachMenu(false);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processDoc(file);
      if (docInputRef.current) docInputRef.current.value = '';
    }
    setShowAttachMenu(false);
  };

  const handleWebResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim()) return;

    // Ensure we have a valid target folder
    const validFolder = folders.includes(targetFolder) ? targetFolder : folders[0];
    if (!validFolder) {
      alert("No folders available. Please create a folder first.");
      setShowWebModal(false);
      return;
    }

    setShowWebModal(false);
    setUploading(true);
    setUploadStatus(`Researching for ${validFolder}: ${webQuery}...`);

    try {
      // Pass full course context (Title + Description) to AI
      const result = await researchWebTopic(webQuery, `${course.title}: ${course.description}`);
      addMaterial('web', webQuery, result.text, validFolder);
    } catch (error) {
      console.error(error);
      alert("Web research failed.");
    } finally {
      setUploading(false);
      setUploadStatus('');
      setWebQuery('');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const currentSession = sessions.find(s => s.id === activeSessionId);
    // Check if this is the first user interaction in this session
    const shouldGenerateTitle = currentSession && currentSession.messages.filter(m => m.role === 'user').length === 0;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let newTitle = s.title;
        if (shouldGenerateTitle) {
            // Temporary title until AI generation completes
            newTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '');
        }
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, userMsg],
          lastModified: Date.now()
        };
      }
      return s;
    }));

    // Trigger async title generation
    if (shouldGenerateTitle) {
        generateChatTitle(input).then(title => {
            if (title) {
                setSessions(prev => prev.map(s => {
                    if (s.id === activeSessionId) return { ...s, title };
                    return s;
                }));
            }
        });
    }

    setInput('');
    setChatLoading(true);

    try {
      let contextString = `You are an expert AI Tutor for the course: "${course.title}". 
      ${course.description ? `Description: ${course.description}` : ''}
      
      Your goal is to help the student master this subject. 
      Use the provided KNOWLEDGE BASE below to answer questions. 
      
      If the answer is not found in the knowledge base, you have access to Google Search to find up-to-date information. Use it to supplement your answers when necessary.
      
      CRITICAL CITATION RULE:
      When you derive an answer from a specific material in the Knowledge Base, you MUST cite the source title in bold brackets at the end of the sentence or paragraph.
      Format: **[Material Title]**
      Example: "The mitochondria is the powerhouse of the cell **[Lecture 1 Video]**."
      
      === KNOWLEDGE BASE (Analyzed Course Materials) ===
      `;

      if (materials.length === 0) {
        contextString += "No materials uploaded yet. Encourage the user to upload video, audio, or documents.";
      } else {
        folders.forEach(folder => {
            const folderMats = materials.filter(m => m.folder === folder);
            if (folderMats.length > 0) {
                contextString += `\n\n--- FOLDER: ${folder} ---`;
                folderMats.forEach((mat) => {
                    contextString += `\n[${mat.type.toUpperCase()}] ${mat.title}: ${mat.summary}`;
                });
            }
        });
      }

      const currentHistory = sessions.find(s => s.id === activeSessionId)?.messages || [];
      const apiHistory = currentHistory.filter(m => m.id !== '1'); 
      
      const responseText = await chatWithCourseAgent(apiHistory, userMsg.content, contextString);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, botMsg],
            lastModified: Date.now()
          };
        }
        return s;
      }));
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I encountered an error. Please check your connection or try again.",
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, errorMsg],
            lastModified: Date.now()
          };
        }
        return s;
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadChat = () => {
    const transcript = messages.map(m => {
      const role = m.role === 'user' ? 'You' : 'AI Agent';
      const time = new Date(m.timestamp).toLocaleString();
      return `[${time}] ${role}:\n${m.content}\n`;
    }).join('\n----------------------------------------\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.title.replace(/\s+/g, '_')}_chat.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMaterialCard = (mat: Material) => {
      let Icon = FileText;
      let colorClass = "text-orange-400 bg-orange-500/10";
      let borderClass = "border-orange-500/20";
      
      if (mat.type === 'video') { 
        Icon = Video; 
        colorClass = "text-blue-400 bg-blue-500/10"; 
        borderClass = "border-blue-500/20";
      }
      if (mat.type === 'audio') { 
        Icon = PlayCircle; 
        colorClass = "text-purple-400 bg-purple-500/10"; 
        borderClass = "border-purple-500/20";
      }
      if (mat.type === 'web') { 
        Icon = Globe; 
        colorClass = "text-green-400 bg-green-500/10"; 
        borderClass = "border-green-500/20";
      }

      return (
        <div key={mat.id} className={`bg-[#252a30] rounded-[24px] shadow-sm border ${borderClass} overflow-hidden transition-all hover:shadow-md group relative hover:bg-[#2d323a]`}>
          <button 
            onClick={(e) => deleteMaterial(mat.id, e)}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
            title="Delete Material"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="px-6 pt-6 pb-4 flex items-start gap-4">
             <div className={`p-3 rounded-2xl flex-shrink-0 ${colorClass}`}>
               <Icon className={`w-6 h-6`} />
             </div>
             <div className="flex-1 min-w-0 pt-1">
               <h3 className="font-bold text-slate-200 text-lg leading-tight pr-8 break-words">{mat.title}</h3>
               <div className="flex items-center gap-3 mt-2">
                 <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${colorClass} bg-opacity-20`}>{mat.type}</span>
                 <span className="text-xs text-slate-500 flex items-center gap-1">
                   <Calendar className="w-3 h-3" />
                   {new Date(mat.timestamp).toLocaleDateString()}
                 </span>
               </div>
             </div>
          </div>
          <div className="px-6 pb-6">
            <div className="prose prose-invert prose-sm max-w-none text-slate-400">
              <ReactMarkdown>{mat.summary}</ReactMarkdown>
            </div>
          </div>
        </div>
      );
  };

  return (
    <div className="flex h-full gap-4">
      {/* Hidden File Inputs */}
      <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={handleVideoUpload} />
      <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
      <input type="file" ref={docInputRef} accept="application/pdf,image/*,text/*" className="hidden" onChange={handleDocUpload} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-[#1a1c20] rounded-[32px] overflow-hidden relative shadow-md border border-white/5">
        {/* Header with Tabs - M3 Surface Container */}
        <div className="bg-[#1a1c20] p-4 pb-0">
          <div className="flex justify-between items-center mb-6 pl-2 pr-2 pt-2">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${course.color} flex items-center justify-center text-white font-bold shadow-lg shadow-black/20 text-xl`}>
                    {course.title.charAt(0)}
                </div>
                <div>
                  <h2 className="font-normal text-slate-200 text-xl">{course.title}</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {materials.length} items analyzed
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 hidden lg:flex">
                <button
                  onClick={handleNewChat}
                  className="px-4 py-2 text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-full transition-colors text-sm font-medium flex items-center gap-2 border border-indigo-500/20"
                  title="New Chat Session"
                >
                   <MessageSquarePlus className="w-4 h-4" /> New Chat
                </button>
                <button
                  onClick={handleDownloadChat}
                  className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-full transition-colors"
                  title="Save Chat Transcript"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
          </div>

          <div className="flex gap-2 px-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
                  activeTab === 'chat' 
                    ? 'bg-[#252a30] text-indigo-200 shadow-sm ring-1 ring-white/10' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat Agent
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-[#252a30] text-indigo-200 shadow-sm ring-1 ring-white/10' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <Folder className="w-4 h-4" />
                Overview & Folders
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
                  activeTab === 'materials' 
                    ? 'bg-[#252a30] text-indigo-200 shadow-sm ring-1 ring-white/10' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <FileStack className="w-4 h-4" />
                Knowledge Base
                <span className="ml-1 bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full">{materials.length}</span>
              </button>
          </div>
        </div>

        {/* Content Area - Chat */}
        <div className={`flex-1 flex flex-row min-h-0 relative ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
          
          {/* Chat History Sidebar */}
          <div className={`${showHistoryPanel ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 flex flex-col bg-[#15171b] h-full border-r border-white/5`}>
             <div className="p-6 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">History</span>
                <button onClick={() => setShowHistoryPanel(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-white/10">
                    <X className="w-4 h-4" />
                </button>
             </div>
             <div className="overflow-y-auto flex-1 p-3 space-y-1">
                 {sessions.map(session => (
                     <div 
                        key={session.id}
                        className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-[#252a30] text-indigo-300 font-medium border border-white/5' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setActiveSessionId(session.id)}
                     >
                        <div className="flex-1 min-w-0 pr-2">
                             <p className="text-sm truncate">{session.title}</p>
                             <p className="text-[10px] opacity-60 mt-0.5">{new Date(session.lastModified).toLocaleDateString()}</p>
                        </div>
                        {sessions.length > 1 && (
                            <button 
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-white/5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                     </div>
                 ))}
             </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-[#0f1115] m-2 rounded-[24px] shadow-sm overflow-hidden border border-white/5">
              {/* Chat Header Inside View */}
              <div className="p-3 px-6 border-b border-white/5 flex items-center justify-between bg-[#1a1c20] z-10">
                 <button 
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition-colors ${showHistoryPanel ? 'bg-indigo-500/20 text-indigo-300' : 'bg-[#252a30] text-slate-400 hover:bg-[#323842]'}`}
                 >
                    <Clock className="w-3.5 h-3.5" />
                    {showHistoryPanel ? 'Hide History' : 'View History'}
                 </button>
                 <span className="text-[10px] text-slate-600 font-mono bg-[#252a30] px-2 py-1 rounded-md">ID: {activeSessionId.slice(-4)}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 bg-[#0f1115]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-[#252a30]' : 'bg-indigo-600 text-white'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5 text-slate-400" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    
                    <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`px-6 py-4 rounded-[24px] text-base leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-[#252a30] text-slate-200 rounded-tl-sm border border-white/5'
                        }`}
                      >
                        <div className="prose prose-sm md:prose-base max-w-none prose-invert break-words">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-2">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.role === 'model' && (
                              <button
                                  onClick={() => handlePlayTTS(msg.id, msg.content)}
                                  disabled={isGeneratingAudioId === msg.id}
                                  className="text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-white/10"
                                  title="Read Aloud"
                              >
                                  {isGeneratingAudioId === msg.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : playingMessageId === msg.id ? (
                                      <VolumeX className="w-3.5 h-3.5" />
                                  ) : (
                                      <Volume2 className="w-3.5 h-3.5" />
                                  )}
                              </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                       <Sparkles className="w-5 h-5 text-white" />
                     </div>
                     <div className="bg-[#252a30] px-6 py-4 rounded-[24px] rounded-tl-sm flex items-center gap-2 border border-white/5">
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                     </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="p-4 lg:p-6 bg-[#1a1c20] border-t border-white/5">
                 <form onSubmit={handleSendMessage} className="relative flex items-end gap-2">
                   
                   {/* Attach Button & Menu */}
                   <div className="relative z-20 flex-shrink-0" ref={attachMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="p-3.5 bg-[#252a30] text-slate-400 hover:text-indigo-400 hover:bg-[#323842] rounded-full transition-all hover:rotate-90 active:scale-95"
                        title="Add Course Material"
                      >
                         <Plus className="w-6 h-6" />
                      </button>

                      {showAttachMenu && (
                        <div className="absolute bottom-16 left-0 w-72 bg-[#252a30] rounded-[24px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 p-2">
                           <div className="bg-[#1a1c20] rounded-xl p-3 mb-2 border border-white/5">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Target Folder</label>
                             <div className="relative">
                               <select 
                                 value={targetFolder}
                                 onChange={(e) => setTargetFolder(e.target.value)}
                                 onClick={(e) => e.stopPropagation()}
                                 className="w-full text-sm bg-[#252a30] border-none text-slate-200 rounded-lg py-2.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none shadow-sm cursor-pointer"
                               >
                                  {folders.map(f => <option key={f} value={f}>{f}</option>)}
                               </select>
                               <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                             </div>
                           </div>

                           <div className="space-y-1">
                              <button type="button" onClick={() => videoInputRef.current?.click()} className="w-full text-left flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl text-slate-300 transition-colors">
                                 <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Video className="w-5 h-5" /></div>
                                 <span className="text-sm font-medium">Upload Video</span>
                              </button>
                              <button type="button" onClick={() => audioInputRef.current?.click()} className="w-full text-left flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl text-slate-300 transition-colors">
                                 <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Mic className="w-5 h-5" /></div>
                                 <span className="text-sm font-medium">Upload Audio</span>
                              </button>
                              <button type="button" onClick={() => docInputRef.current?.click()} className="w-full text-left flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl text-slate-300 transition-colors">
                                 <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg"><FileText className="w-5 h-5" /></div>
                                 <span className="text-sm font-medium">Upload Document</span>
                              </button>
                              <button type="button" onClick={() => { setShowWebModal(true); setShowAttachMenu(false); }} className="w-full text-left flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl text-slate-300 transition-colors">
                                 <div className="p-2 bg-green-500/10 text-green-400 rounded-lg"><Globe className="w-5 h-5" /></div>
                                 <span className="text-sm font-medium">Add Web Link</span>
                              </button>
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="relative flex-1">
                     <textarea
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleSendMessage();
                         }
                       }}
                       placeholder={`Ask about ${course.title}...`}
                       className="w-full pl-6 pr-14 py-4 bg-[#252a30] border-none rounded-[28px] focus:bg-[#323842] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-[56px] max-h-[120px] text-slate-200 placeholder-slate-500"
                     />
                     <button
                       type="submit"
                       disabled={!input.trim() || chatLoading}
                       className="absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-indigo-900/40 active:scale-95"
                     >
                       <Send className="w-5 h-5" />
                     </button>
                   </div>
                 </form>
              </div>
          </div>
        </div>

        {/* Content Area - Folders Overview */}
        <div className={`flex-1 overflow-y-auto bg-[#0f1115] m-2 rounded-[24px] p-6 lg:p-10 ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
           <div className="max-w-5xl mx-auto">
             
             {!currentFolderView ? (
                // Folder Grid View
                <>
                  {/* Synthesis Section */}
                  <div className="mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                           <h3 className="text-2xl font-normal text-slate-200 flex items-center gap-2">
                               <Sparkles className="w-6 h-6 text-indigo-500" />
                               Executive Summary
                           </h3>
                           <p className="text-slate-500 mt-1">AI-generated syllabus and synthesis of all materials</p>
                        </div>
                        <button
                            onClick={handleGenerateSynthesis}
                            disabled={isGeneratingSynthesis || materials.length === 0}
                            className="bg-[#252a30] text-indigo-300 px-6 py-3 rounded-full hover:bg-[#323842] font-medium transition-colors border border-white/10 flex items-center gap-2"
                        >
                            {isGeneratingSynthesis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {synthesis ? 'Regenerate' : 'Generate Synthesis'}
                        </button>
                    </div>
                    {synthesis ? (
                        <div className="bg-[#1a1c20] p-8 rounded-[32px] border border-white/5 shadow-sm prose prose-invert max-w-none prose-headings:font-normal prose-h1:text-3xl prose-p:text-slate-400">
                            <ReactMarkdown>{synthesis}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="bg-[#1a1c20]/50 p-10 rounded-[32px] border-2 border-dashed border-slate-800 text-center text-slate-500">
                            <Sparkles className="w-10 h-10 mx-auto mb-4 text-slate-600" />
                            <h4 className="text-lg font-medium text-slate-400 mb-2">No Synthesis Generated Yet</h4>
                            <p className="mb-6 max-w-md mx-auto">Upload materials to weeks below, then generate a comprehensive AI synthesis of your entire course.</p>
                            <button
                                onClick={handleGenerateSynthesis}
                                disabled={materials.length === 0}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
                            >
                                Start Generation
                            </button>
                        </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 my-10"></div>

                  <h3 className="text-2xl font-normal text-slate-200 mb-8 flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-slate-500" />
                    Course Modules
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {folders.map((folderName, idx) => {
                      const itemCount = materials.filter(m => m.folder === folderName).length;
                      // M3 Dark tonal palette loop (darker backgrounds)
                      const bgColors = ['bg-blue-900/20', 'bg-violet-900/20', 'bg-emerald-900/20', 'bg-amber-900/20', 'bg-rose-900/20'];
                      const textColors = ['text-blue-300', 'text-violet-300', 'text-emerald-300', 'text-amber-300', 'text-rose-300'];
                      const colorIndex = idx % bgColors.length;
                      const isEditing = folderToEdit === folderName;
                      
                      return (
                        <div 
                          key={folderName} 
                          onClick={() => !isEditing && setCurrentFolderView(folderName)}
                          className={`${bgColors[colorIndex]} p-6 rounded-[28px] ${!isEditing && 'hover:bg-opacity-30 cursor-pointer'} transition-all group flex flex-col items-center text-center h-48 justify-center relative overflow-visible border border-white/5 hover:border-white/10`}
                        >
                          {isEditing ? (
                            <div className="w-full flex flex-col items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="text"
                                value={editFolderValue}
                                onChange={(e) => setEditFolderValue(e.target.value)}
                                className="w-full bg-[#0f1115] border border-indigo-500 rounded-lg px-2 py-1 text-center text-slate-200 outline-none text-sm"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); }}
                              />
                              <div className="flex gap-2">
                                <button onClick={handleSaveRename} className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setFolderToEdit(null)} className="p-1.5 bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600"><X className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ) : (
                            <>
                                <Folder className={`w-12 h-12 ${textColors[colorIndex]} mb-4 opacity-80 group-hover:scale-110 transition-transform`} />
                                <h4 className={`font-medium text-lg ${textColors[colorIndex]} line-clamp-1 break-all px-2`}>{folderName}</h4>
                                <span className="text-xs font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full mt-3 text-slate-400 backdrop-blur-sm">{itemCount} items</span>
                                
                                {/* Edit/Delete Controls */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={(e) => handleStartRename(folderName, e)} className="p-2 bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white rounded-full transition-colors" title="Rename Folder">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => handleDeleteFolder(folderName, e)} className="p-2 bg-black/40 hover:bg-rose-900/60 text-slate-300 hover:text-rose-400 rounded-full transition-colors" title="Delete Folder">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add Folder Button */}
                    <div 
                        className="bg-[#252a30] p-6 rounded-[28px] border-2 border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center text-center h-48 justify-center relative group"
                        onClick={() => { if (!isAddingFolder) { setIsAddingFolder(true); setTimeout(() => document.getElementById('new-folder-input')?.focus(), 0); } }}
                    >
                         {isAddingFolder ? (
                             <div className="w-full flex flex-col items-center gap-2 z-10 px-4" onClick={(e) => e.stopPropagation()}>
                                <input
                                    id="new-folder-input"
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Folder Name"
                                    className="w-full bg-[#0f1115] border border-indigo-500 rounded-lg px-2 py-2 text-center text-slate-200 outline-none text-sm placeholder-slate-600"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddFolder(e); }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddFolder} className="px-4 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 text-xs font-bold">Add</button>
                                    <button onClick={() => { setIsAddingFolder(false); setNewFolderName(''); }} className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 text-xs font-bold">Cancel</button>
                                </div>
                             </div>
                         ) : (
                             <>
                                <div className="w-12 h-12 rounded-full bg-[#1a1c20] text-slate-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center mb-3 shadow-sm transition-all">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h4 className="font-medium text-slate-400 group-hover:text-indigo-400 transition-colors">Add Folder</h4>
                             </>
                         )}
                    </div>
                  </div>
                </>
             ) : (
                // Selected Folder View
                <div>
                   <button 
                     onClick={() => setCurrentFolderView(null)}
                     className="mb-8 flex items-center px-4 py-2 bg-[#252a30] hover:bg-[#323842] rounded-full text-sm font-medium text-slate-300 transition-colors w-fit border border-white/5"
                   >
                     <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
                   </button>
                   
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-3xl font-normal text-slate-100 flex items-center gap-4">
                        <Folder className="w-8 h-8 text-indigo-500" />
                        {currentFolderView}
                      </h3>
                      <span className="bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-500/20">
                        {materials.filter(m => m.folder === currentFolderView).length} items
                      </span>
                   </div>

                   <div className="space-y-6">
                     {materials.filter(m => m.folder === currentFolderView).length === 0 ? (
                        <div className="text-center py-24 bg-[#1a1c20] rounded-[32px] border border-dashed border-slate-700">
                           <p className="text-slate-500 text-lg">No materials in {currentFolderView} yet.</p>
                           <button 
                             onClick={() => { setActiveTab('materials'); setTargetFolder(currentFolderView); }}
                             className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium underline decoration-2 underline-offset-4"
                           >
                             Upload materials
                           </button>
                        </div>
                     ) : (
                        materials
                          .filter(m => m.folder === currentFolderView)
                          .map(renderMaterialCard)
                     )}
                   </div>
                </div>
             )}
           </div>
        </div>

        {/* Content Area - Materials List (Replaces Sidebar) */}
        <div className={`flex-1 overflow-y-auto bg-[#0f1115] m-2 rounded-[24px] p-6 lg:p-10 ${activeTab === 'materials' ? 'block' : 'hidden'}`}>
             <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h3 className="text-3xl font-normal text-slate-200 mb-2 flex items-center gap-3">
                    <FileStack className="w-8 h-8 text-indigo-500" />
                    Knowledge Base
                  </h3>
                  <p className="text-slate-500 text-lg">
                    Manage all uploaded documents, audio, and videos for this course.
                  </p>
                </div>

                {materials.length === 0 ? (
                  <div className="text-center py-24 bg-[#1a1c20] rounded-[32px] border border-dashed border-slate-700">
                      <div className="w-20 h-20 bg-[#252a30] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <FileUp className="w-10 h-10 text-slate-500" />
                      </div>
                      <h4 className="text-xl font-medium text-slate-300 mb-2">Your Knowledge Base is Empty</h4>
                      <p className="text-slate-500">Upload content using the <span className="font-bold text-indigo-400">+</span> button in the chat tab.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {folders.map(folder => {
                      const folderMaterials = materials.filter(m => m.folder === folder);
                      if (folderMaterials.length === 0) return null;
                      const isExpanded = expandedFolders.includes(folder);

                      return (
                        <div key={folder} className="bg-[#1a1c20] rounded-[24px] overflow-hidden border border-white/5">
                          <button 
                            onClick={() => toggleFolderAccordion(folder)}
                            className={`w-full flex items-center justify-between p-6 text-left transition-colors ${isExpanded ? 'bg-[#252a30]' : 'hover:bg-[#252a30]/50'}`}
                          >
                            <span className="flex items-center gap-4 text-lg font-medium text-slate-200">
                              <Folder className={`w-6 h-6 ${isExpanded ? 'fill-indigo-500/20 text-indigo-400' : 'text-slate-500'}`} />
                              {folder}
                              <span className="text-sm font-bold bg-white/5 text-slate-400 px-3 py-1 rounded-full">{folderMaterials.length}</span>
                            </span>
                            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 pt-0 bg-[#252a30] grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="col-span-full h-4"></div>
                              {folderMaterials.map((mat) => (
                                 <div key={mat.id} className="col-span-1">
                                    {renderMaterialCard(mat)}
                                 </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
        </div>

      </div>

      {/* Floating Upload Progress Toast */}
      {uploading && (
         <div className="fixed bottom-8 right-8 bg-[#1a1c20] rounded-2xl shadow-2xl p-5 flex items-center gap-5 z-50 border border-indigo-500/20 animate-in slide-in-from-bottom-10 fade-in duration-300 max-w-sm">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0 relative">
               <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
            <div className="min-w-0">
               <p className="font-bold text-slate-200 mb-0.5">Processing Content</p>
               <p className="text-sm text-slate-400 truncate">{uploadStatus}</p>
            </div>
         </div>
      )}

      {/* Web Search Modal - M3 Dialog Dark */}
      {showWebModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1c20] rounded-[28px] shadow-2xl max-w-md w-full p-8 transform transition-all border border-white/10">
            <h3 className="font-normal text-2xl text-slate-100 mb-6 flex items-center gap-3">
              <Globe className="w-6 h-6 text-green-500" />
              Add Web Topic
            </h3>
            <form onSubmit={handleWebResearch}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Target Folder</label>
                <div className="relative">
                    <select 
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    className="w-full bg-[#252a30] border-none text-slate-200 text-base rounded-2xl p-4 focus:ring-2 focus:ring-green-500 outline-none shadow-sm appearance-none cursor-pointer"
                    >
                    {folders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-4 w-5 h-5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="mb-8">
                <input
                    autoFocus
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="e.g. Recent advancements in CRISPR..."
                    className="w-full p-4 bg-[#252a30] border-none rounded-2xl text-base shadow-sm focus:ring-2 focus:ring-green-500 outline-none text-slate-200 placeholder-slate-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowWebModal(false)}
                  className="px-6 py-3 text-slate-400 hover:bg-white/5 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!webQuery.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-900/40"
                >
                  Research & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePage;