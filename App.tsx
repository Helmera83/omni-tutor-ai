import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CoursePage from './components/CoursePage';
import Login from './components/Login';
import { Course } from './types';
import { Sparkles, Plus, BookOpen, Trash2, X, Settings as SettingsIcon, Edit2, Check, GraduationCap } from 'lucide-react';

// Predefined colors for courses - M3 Tones
const COURSE_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'
];

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('omnitutor_auth') === 'true';
  });
  
  const [userName, setUserName] = useState<string>('Student');

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // Editing State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Load courses from local storage
  useEffect(() => {
    const saved = localStorage.getItem('omnitutor_courses');
    if (saved) {
      setCourses(JSON.parse(saved));
    } else {
      // Default courses for demo
      const defaults = [
        { id: '1', title: 'Biology 101', description: 'Introduction to Cell Biology and Genetics', color: 'bg-emerald-600', icon: 'book' },
        { id: '2', title: 'European History', description: 'History of Europe from 1900 to Present', color: 'bg-blue-600', icon: 'history' },
      ];
      setCourses(defaults);
      localStorage.setItem('omnitutor_courses', JSON.stringify(defaults));
    }
  }, []);

  // Load user name
  useEffect(() => {
    if (isAuthenticated) {
      const storedName = localStorage.getItem('omnitutor_user_name');
      if (storedName) setUserName(storedName);
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    localStorage.setItem('omnitutor_auth', 'true');
    const storedName = localStorage.getItem('omnitutor_user_name');
    if (storedName) setUserName(storedName);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('omnitutor_auth');
    // We keep the name in storage for next login convenience, but reset state
    setIsAuthenticated(false);
    setSelectedCourseId(null);
  };

  const saveCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
    localStorage.setItem('omnitutor_courses', JSON.stringify(newCourses));
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle) return;

    const newCourse: Course = {
      id: Date.now().toString(),
      title: newCourseTitle,
      description: newCourseDesc,
      color: COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
      icon: 'book'
    };

    saveCourses([...courses, newCourse]);
    setShowAddModal(false);
    setNewCourseTitle('');
    setNewCourseDesc('');
    if (!selectedCourseId) {
      setSelectedCourseId(newCourse.id);
    }
  };

  const handleDeleteCourse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this course and its agent?")) {
      const filtered = courses.filter(c => c.id !== id);
      saveCourses(filtered);
      
      // Cleanup persistent memory
      localStorage.removeItem(`omnitutor_materials_${id}`);
      localStorage.removeItem(`omnitutor_chat_${id}`);

      if (selectedCourseId === id) setSelectedCourseId(null);
    }
  };

  const startEditing = (course: Course) => {
    setEditingCourseId(course.id);
    setEditTitle(course.title);
    setEditDesc(course.description);
  };

  const cancelEditing = () => {
    setEditingCourseId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const saveEditedCourse = () => {
    if (!editingCourseId || !editTitle.trim()) return;

    const updatedCourses = courses.map(c => 
      c.id === editingCourseId 
        ? { ...c, title: editTitle, description: editDesc } 
        : c
    );

    saveCourses(updatedCourses);
    setEditingCourseId(null);
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || null;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#0f1115] overflow-hidden font-sans text-[#e2e2e6]">
      <Sidebar 
        selectedCourse={selectedCourse}
        onBackToDashboard={() => setSelectedCourseId(null)}
        courses={courses}
        onSelectCourse={(c) => setSelectedCourseId(c.id)}
        onAddCourse={() => setShowAddModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={handleLogout}
        userName={userName}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {selectedCourse ? (
          <div className="flex-1 p-2 lg:p-4 h-full overflow-hidden">
             <CoursePage key={selectedCourse.id} course={selectedCourse} />
          </div>
        ) : (
          <Dashboard 
            courses={courses} 
            onSelect={(c) => setSelectedCourseId(c.id)} 
            onAdd={() => setShowAddModal(true)}
            onDelete={handleDeleteCourse}
            userName={userName}
          />
        )}
      </main>

      {/* Add Course Modal - M3 Dialog Dark */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-[#1a1c20] rounded-[28px] shadow-2xl max-w-md w-full p-8 transform transition-all scale-100 border border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-normal text-slate-100">Create Agent</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-100 p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddCourse}>
              <div className="mb-6 group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Psychology"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-[#252a30] border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-lg shadow-sm placeholder-slate-500 text-white outline-none transition-all"
                />
              </div>
              
              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                <textarea
                  placeholder="Briefly describe what this course covers..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="w-full px-5 py-4 bg-[#252a30] border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-base shadow-sm h-32 resize-none placeholder-slate-500 text-white outline-none transition-all"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-indigo-300 hover:bg-white/5 rounded-full font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCourseTitle}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-900/40 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal - M3 Dialog Dark */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1c20] rounded-[28px] shadow-2xl max-w-lg w-full p-8 flex flex-col max-h-[85vh] border border-white/10">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 flex-shrink-0">
              <h2 className="text-2xl font-normal text-slate-100 flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-slate-400" />
                Settings
              </h2>
              <button 
                onClick={() => { setShowSettingsModal(false); cancelEditing(); }} 
                className="text-slate-400 hover:text-slate-100 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Your Courses</h3>
              
              {courses.length === 0 ? (
                <p className="text-slate-500 italic text-center py-8">No courses added yet.</p>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="bg-[#252a30] rounded-3xl p-1 shadow-sm border border-transparent hover:border-white/10 transition-all">
                    {editingCourseId === course.id ? (
                       <div className="p-4 space-y-3">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Editing</span>
                         </div>
                         <input
                           type="text"
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           className="w-full p-3 bg-[#0f1115] text-white rounded-xl text-base outline-none focus:ring-2 focus:ring-indigo-500 border border-white/10"
                           placeholder="Course Title"
                           autoFocus
                         />
                         <textarea
                           value={editDesc}
                           onChange={(e) => setEditDesc(e.target.value)}
                           className="w-full p-3 bg-[#0f1115] text-white rounded-xl text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500 border border-white/10"
                           placeholder="Description"
                         />
                         <div className="flex justify-end gap-2 pt-2">
                           <button 
                             onClick={cancelEditing} 
                             className="px-4 py-2 text-slate-400 hover:bg-white/10 rounded-full text-sm font-medium"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={saveEditedCourse} 
                             className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-full text-sm font-medium"
                           >
                             Save
                           </button>
                         </div>
                       </div>
                    ) : (
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`w-12 h-12 rounded-2xl ${course.color} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm`}>
                            {course.title.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-200 text-lg block truncate">{course.title}</span>
                            <span className="text-sm text-slate-400 block truncate">
                              {course.description || "No description"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                           <button 
                             onClick={() => startEditing(course)}
                             className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-full transition-colors"
                             title="Edit Course"
                           >
                             <Edit2 className="w-5 h-5" />
                           </button>
                           <button 
                             onClick={(e) => handleDeleteCourse(course.id, e)}
                             className="p-3 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors"
                             title="Delete Course"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-6 mt-4 border-t border-white/10 flex-shrink-0">
              <button 
                onClick={() => { setShowSettingsModal(false); setShowAddModal(true); cancelEditing(); }}
                className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-6 h-6" />
                Add New Course
              </button>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { setShowSettingsModal(false); cancelEditing(); }}
                  className="px-6 py-3 bg-[#0f1115] text-slate-200 rounded-full font-medium hover:bg-black transition-colors border border-white/10"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DashboardProps {
  courses: Course[];
  onSelect: (course: Course) => void;
  onAdd: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  userName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ courses, onSelect, onAdd, onDelete, userName }) => {
  return (
    <div className="max-w-7xl mx-auto h-full overflow-y-auto w-full p-6 lg:p-12">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-normal text-slate-200">
           Welcome back, <span className="text-indigo-400">{userName}</span>
        </h1>
        <p className="text-slate-500">Select a course to continue your learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {courses.map((course) => (
          <div 
            key={course.id}
            onClick={() => onSelect(course)}
            className="group relative bg-[#1a1c20] hover:bg-[#252a30] rounded-[32px] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[320px] hover:shadow-2xl hover:shadow-black/50 border border-white/5 hover:border-white/10"
          >
            <div className={`h-32 ${course.color} w-full opacity-90 group-hover:opacity-100 transition-opacity relative overflow-hidden`}>
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
               <div className="absolute bottom-6 left-8 bg-black/30 backdrop-blur-md p-3 rounded-2xl text-white border border-white/10">
                  <BookOpen className="w-8 h-8" />
               </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-2xl font-medium text-slate-100 mb-3 line-clamp-1">{course.title}</h3>
              <p className="text-slate-400 text-base leading-relaxed line-clamp-2 mb-6 flex-1">
                {course.description || "No description provided."}
              </p>
              
              <div className="flex items-center text-sm font-bold tracking-wide text-indigo-400 uppercase mt-auto group-hover:underline decoration-2 underline-offset-4">
                Enter Course <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">&rarr;</span>
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={onAdd}
          className="bg-[#1a1c20] rounded-[32px] border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all cursor-pointer flex flex-col items-center justify-center h-[320px] group"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#252a30] text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center mb-6 transition-all duration-300 shadow-sm group-hover:shadow-indigo-900 group-hover:shadow-lg">
            <Plus className="w-10 h-10" />
          </div>
          <span className="font-medium text-lg text-slate-500 group-hover:text-indigo-400">Create New Agent</span>
        </button>
      </div>
    </div>
  );
};

export default App;