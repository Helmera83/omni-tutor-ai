import React, { useState } from 'react';
import { LayoutDashboard, Plus, Settings, ChevronLeft, ChevronRight, GraduationCap, LogOut, User } from 'lucide-react';
import { Course } from '../types';

interface SidebarProps {
  selectedCourse: Course | null;
  onBackToDashboard: () => void;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onAddCourse: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  selectedCourse, 
  onBackToDashboard,
  courses,
  onSelectCourse,
  onAddCourse,
  onOpenSettings,
  onLogout,
  userName = 'Student'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`relative bg-[#1a1c20] border-r border-white/5 flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.0,0,1.0)] h-full m-2 ml-0 rounded-r-[28px] ${isCollapsed ? 'w-20' : 'w-20 lg:w-[280px]'}`}>
      
      {/* Desktop Collapse Toggle - Floating Action */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-24 bg-[#252a30] text-slate-400 hover:text-indigo-400 rounded-full p-1.5 shadow-md z-10 transition-transform hover:scale-110 active:scale-95 border border-white/10"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header / Logo */}
      <div 
        className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-6'} cursor-pointer`} 
        onClick={onBackToDashboard}
        title="Go to Dashboard"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/20">
             <GraduationCap className="w-6 h-6" />
          </div>
          <span className={`font-medium text-2xl tracking-tight text-[#e2e2e6] transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
            OmniTutor
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
        
        {/* Dashboard Link - Pill Shaped */}
        <button
          onClick={onBackToDashboard}
          title="Dashboard"
          className={`flex items-center h-14 px-4 rounded-full transition-all duration-200 group relative ${!selectedCourse ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
        >
          <LayoutDashboard className={`w-6 h-6 flex-shrink-0 transition-colors ${!selectedCourse ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`} />
          <span className={`ml-4 font-medium text-sm tracking-wide transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
            Dashboard
          </span>
        </button>

        <div className={`mt-8 px-4 mb-2 transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider text-[10px]">My Courses</h3>
        </div>

        {isCollapsed && <div className="border-t border-white/5 my-2 mx-4"></div>}
        
        {/* Course List */}
        <div className="space-y-1">
          {courses.map(course => {
             const isSelected = selectedCourse?.id === course.id;
             return (
               <button
                 key={course.id}
                 onClick={() => onSelectCourse(course)}
                 title={course.title}
                 className={`w-full flex items-center h-14 px-4 rounded-full transition-all duration-200 group relative ${isSelected ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
               >
                 <div className={`w-6 h-6 rounded-md ${course.color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0`}>
                   {course.title.substring(0,1).toUpperCase()}
                 </div>
                 <span className={`ml-4 font-medium text-sm truncate text-left flex-1 transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
                    {course.title}
                 </span>
               </button>
             );
          })}
        </div>
        
        {/* Add Course Button */}
        <div className="mt-4">
           <button 
             onClick={onAddCourse}
             title="Add New Course"
             className={`w-full flex items-center h-14 px-4 rounded-full border border-dashed border-slate-700 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 transition-all hover:bg-indigo-500/10 ${isCollapsed ? 'justify-center px-0' : ''}`}
           >
             <Plus className="w-6 h-6" />
             <span className={`ml-4 font-medium text-sm transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
               Add Course
             </span>
           </button>
        </div>
      </div>

      {/* Footer / Settings */}
      <div className="p-3 mb-2 space-y-1">
        <button 
          onClick={onOpenSettings}
          title="Settings"
          className={`w-full flex items-center h-14 px-4 rounded-full text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings className="w-6 h-6" />
          <span className={`ml-4 font-medium text-sm transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
            Settings
          </span>
        </button>

        <div className={`mt-2 bg-[#252a30] rounded-3xl p-2 pr-3 flex items-center gap-3 border border-white/5 transition-all ${isCollapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
             {initials}
          </div>
          <div className={`flex-1 min-w-0 transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}>
             <p className="font-medium text-sm text-slate-200 truncate">{userName}</p>
             <p className="text-[10px] text-slate-500 font-medium">Student Account</p>
          </div>
          <button 
            onClick={onLogout}
            title="Log Out"
            className={`p-2 rounded-full text-slate-500 hover:bg-white/10 hover:text-rose-400 transition-colors ${isCollapsed ? 'hidden' : 'hidden lg:block'}`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;