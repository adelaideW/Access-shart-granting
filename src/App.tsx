/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  X, 
  MoreVertical, 
  Copy, 
  Mail, 
  Eye, 
  Users, 
  Pencil, 
  Lock, 
  ChevronDown, 
  ArrowLeftRight,
  HelpCircle,
  Settings,
  ChevronRight,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Role = 'Owner' | 'Editor' | 'Collaborator' | 'Viewer';

interface Person {
  id: string;
  names: string[];
  role: Role;
  isGroup?: boolean;
  title?: string;
  department?: string;
  avatar?: string;
}

export default function App() {
  const [emailNotification, setEmailNotification] = useState(false);
  const [viewMode, setViewMode] = useState<'default' | 'advanced'>('advanced');
  const [isGeneralAccessOpen, setIsGeneralAccessOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>(['All super admin', 'Self - Employee', 'Work location → San Francisco office', 'State → California, US location']);
  const [inputValue, setInputValue] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [activeAccessDropdown, setActiveAccessDropdown] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set(['1']));
  
  const [people, setPeople] = useState<Person[]>([
    { id: '1', names: ['Harry Porter'], role: 'Owner', isGroup: false, title: 'CEO', department: 'Leadership', avatar: 'https://i.pravatar.cc/150?u=harry' }
  ]);

  const [transferSearch, setTransferSearch] = useState('');
  const [isTransferSearchOpen, setIsTransferSearchOpen] = useState(false);
  const [selectedTransferPerson, setSelectedTransferPerson] = useState<string | null>(null);

  const transferSearchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);

  const isOnlyOwner = people.length === 1 && people[0].role === 'Owner';

  // Component for tags cell with overflow detection
  const TagsCell = ({ names, role }: { names: string[], role: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(1);
    const isOwner = role === 'Owner';

    useLayoutEffect(() => {
      if (isOwner || !measureRef.current || !containerRef.current) return;

      const calculateVisible = () => {
        if (!measureRef.current || !containerRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const tagElements = Array.from(measureRef.current.children) as HTMLElement[];
        const badgeWidth = 45; // Approx width for "+X"
        const gap = 8;
        
        let currentWidth = 0;
        let count = 0;

        for (let i = 0; i < tagElements.length; i++) {
          const tagWidth = tagElements[i].offsetWidth;
          
          // If it's the last tag, we don't need to account for the badge
          if (i === tagElements.length - 1) {
            if (currentWidth + tagWidth <= containerWidth) {
              count = names.length;
            } else {
              // If it doesn't fit, we stay at the previous count
              if (count === 0) count = 1;
            }
            break;
          }

          // Can we fit this tag AND the badge for the rest?
          if (currentWidth + tagWidth + gap + badgeWidth <= containerWidth) {
            currentWidth += tagWidth + gap;
            count = i + 1;
          } else {
            // Doesn't fit with badge, stop here
            if (count === 0) count = 1;
            break;
          }
        }
        setVisibleCount(count);
      };

      const observer = new ResizeObserver(calculateVisible);
      observer.observe(containerRef.current);
      calculateVisible();

      return () => observer.disconnect();
    }, [isOwner, names]);

    const displayNames = isOwner ? names : names.slice(0, visibleCount);
    const remainingCount = isOwner ? 0 : names.length - visibleCount;

    return (
      <div className="relative group/tags-cell w-full flex items-center min-h-[30px]" ref={containerRef}>
        {/* Hidden measuring container */}
        {!isOwner && (
          <div 
            ref={measureRef} 
            className="absolute opacity-0 pointer-events-none flex items-center gap-2 flex-nowrap whitespace-nowrap"
            aria-hidden="true"
          >
            {names.map((name, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md border border-gray-200 text-sm">
                <Users className="w-4 h-4 shrink-0" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-nowrap overflow-hidden relative w-full">
          {displayNames.map((name, idx) => (
            <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md border border-gray-200 min-w-0 ${!isOwner ? 'shrink-0' : ''}`}>
              {!isOwner && <Users className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className={`text-sm text-gray-700 ${!isOwner ? 'truncate' : ''}`}>{name}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="px-2 py-1 bg-gray-100 rounded-md border border-gray-200 text-sm text-gray-700 font-medium shrink-0">
              +{remainingCount}
            </div>
          )}
        </div>
        
        {/* Tooltip for all tags - only for non-owners when multiple names exist */}
        {!isOwner && names.length > 1 && (
          <>
            <div className="absolute inset-0 z-10 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 p-4 bg-[#111827] text-white rounded-2xl opacity-0 invisible group-hover/tags-cell:opacity-100 group-hover/tags-cell:visible transition-all z-50 w-80 shadow-2xl border border-white/10 pointer-events-none">
              <div className="font-bold text-sm mb-2">All people/groups:</div>
              <div className="h-[1px] bg-white/10 mb-3" />
              <div className="flex flex-wrap gap-2">
                {names.map((name, idx) => (
                  <div key={idx} className="bg-[#374151] px-3 py-1.5 rounded-lg text-xs font-medium text-white">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const handleConfirmTransfer = () => {
    if (!selectedTransferPerson) return;
    
    setPeople(prev => {
      const newPeople = [...prev];
      const currentOwnerIndex = newPeople.findIndex(p => p.role === 'Owner');
      
      // Find target in current people or available people
      let targetPerson = newPeople.find(p => p.names[0] === selectedTransferPerson);
      let targetInPrev = true;
      
      if (!targetPerson) {
        targetPerson = availablePeople.find(p => p.names[0] === selectedTransferPerson);
        targetInPrev = false;
      }
      
      if (currentOwnerIndex !== -1 && targetPerson) {
        // Current owner becomes Editor
        const oldOwner = { ...newPeople[currentOwnerIndex], role: 'Editor' as Role };
        // Target becomes Owner
        const newOwner = { ...targetPerson, role: 'Owner' as Role };
        
        let updatedPeopleList: Person[];
        if (targetInPrev) {
          // Remove target from its old position
          const filtered = newPeople.filter(p => p.names[0] !== selectedTransferPerson);
          // Update old owner in the list
          updatedPeopleList = filtered.map(p => p.id === oldOwner.id ? oldOwner : p);
        } else {
          // Update old owner in the list
          updatedPeopleList = newPeople.map(p => p.id === oldOwner.id ? oldOwner : p);
        }
        
        // Ensure new owner is in checkedRows
        setCheckedRows(prevChecked => {
          const next = new Set(prevChecked);
          next.add(newOwner.id);
          return next;
        });

        // Put new owner at the top
        return [newOwner, ...updatedPeopleList];
      }
      return prev;
    });
    
    setIsTransferModalOpen(false);
    setTransferSearch('');
    setSelectedTransferPerson(null);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  const addChip = (chip: string) => {
    if (!selectedChips.includes(chip)) {
      setSelectedChips([...selectedChips, chip]);
    }
    setInputValue('');
  };

  const removeChip = (chipToRemove: string) => {
    setSelectedChips(selectedChips.filter(chip => chip !== chipToRemove));
  };

  const toggleRowCheckbox = (id: string) => {
    const person = people.find(p => p.id === id);
    if (person?.role === 'Owner') return; // Owner is always checked and disabled
    const newChecked = new Set(checkedRows);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedRows(newChecked);
  };

  const [availablePeople] = useState<Person[]>([
    { id: '4', names: ['Brett Rios'], role: 'Viewer', isGroup: false, title: 'Software Engineer', department: 'Engineering', avatar: 'https://i.pravatar.cc/150?u=brett' },
    { id: '5', names: ['Erika Rodriguez'], role: 'Viewer', isGroup: false, title: 'Account Executive', department: 'Enterprise', avatar: 'https://i.pravatar.cc/150?u=erika' },
    { id: '6', names: ['Gail Richardson'], role: 'Viewer', isGroup: false, title: 'Account Executive', department: 'Mid-market', avatar: 'https://i.pravatar.cc/150?u=gail' },
    { id: '7', names: ['Alfred Rivera'], role: 'Viewer', isGroup: false, title: 'Account Executive', department: 'SMB', avatar: 'https://i.pravatar.cc/150?u=alfred' }
  ]);

  const handleAddPeople = () => {
    if (selectedChips.length === 0) return;
    
    const newEntry: Person = {
      id: Math.random().toString(36).substr(2, 9),
      names: [...selectedChips],
      role: 'Viewer',
      isGroup: true
    };

    setPeople([...people, newEntry]);
    setSelectedChips([]);
  };

  const removePerson = (id: string) => {
    const personToRemove = people.find(p => p.id === id);
    if (personToRemove) {
      setSelectedChips(prev => prev.filter(chip => !personToRemove.names.includes(chip)));
    }
    setPeople(people.filter(p => p.id !== id));
  };

  const updateRole = (id: string, role: Role) => {
    setPeople(people.map(p => p.id === id ? { ...p, role } : p));
    setActiveAccessDropdown(null);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsInputFocused(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (accessDropdownRef.current && !accessDropdownRef.current.contains(event.target as Node)) {
        setActiveAccessDropdown(null);
      }
      if (transferSearchRef.current && !transferSearchRef.current.contains(event.target as Node)) {
        setIsTransferSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const gridCols = viewMode === 'advanced' ? 'grid-cols-[1fr_120px_120px]' : 'grid-cols-[1fr_120px]';

  const handleCopyLink = () => {
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-auto">
      {/* Snackbar */}
      <AnimatePresence>
        {showSnackbar && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[360px] h-[56px] bg-[#C1E9DA] rounded-2xl shadow-lg flex items-center px-4 justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#0D6345] rounded-full p-0.5">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[#003926] font-semibold text-lg">Link copied</span>
            </div>
            <button 
              onClick={() => setShowSnackbar(false)}
              className="relative flex items-center justify-center"
            >
              <div className="absolute inset-0 border-2 border-[#0D6345] rounded-full opacity-30"></div>
              <div className="bg-[#0D6345] rounded-full p-1">
                <X className="w-3 h-3 text-white" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode Switcher - Moved to top right */}
      <div className="absolute top-6 right-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex gap-1 z-20">
        <button 
          onClick={() => setViewMode('default')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'default' 
            ? 'bg-[#7A005D] text-white shadow-md' 
            : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Default
        </button>
        <button 
          onClick={() => setViewMode('advanced')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'advanced' 
            ? 'bg-[#7A005D] text-white shadow-md' 
            : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[744px] border border-gray-200 z-10 relative">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Sharing access
          </h1>
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Add People Section */}
        <div className="px-6 pb-6 border-b border-gray-100">
          <div className="flex gap-3 items-start">
            <div className="relative flex-1" ref={inputRef}>
              <div 
                className={`w-full min-h-[44px] max-h-[480px] overflow-y-auto p-1.5 bg-white border border-gray-300 rounded-lg flex flex-wrap gap-2 transition-all ${
                  isInputFocused ? 'ring-2 ring-[#7A005D] border-transparent' : ''
                }`}
                onClick={() => {
                  setIsInputFocused(true);
                  document.getElementById('people-input')?.focus();
                }}
              >
                {selectedChips.map(chip => (
                  <div key={chip} className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    <span>{chip}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeChip(chip);
                      }}
                      className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
                <input 
                  id="people-input"
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={selectedChips.length === 0 ? "Add people or group" : ""} 
                  onFocus={() => setIsInputFocused(true)}
                  className="flex-1 min-w-[120px] py-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              
              <div className="absolute right-3 top-3 flex items-center gap-1" ref={moreMenuRef}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400 cursor-pointer" />
                </button>
                
                {/* More Menu Dropdown */}
                <AnimatePresence>
                  {isMoreMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 cursor-default"
                    >
                      <button 
                        onClick={() => {
                          setIsBulkAddOpen(true);
                          setIsMoreMenuOpen(false);
                        }}
                        className="w-full text-left group"
                      >
                        <h3 className="font-semibold text-gray-900 text-lg">Bulk add</h3>
                        <p className="text-sm text-gray-500 mt-1 leading-snug">
                          Add a list of employees using names, IDs, or email addresses
                        </p>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Dropdown */}
              <AnimatePresence>
                {isInputFocused && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[400px] overflow-y-auto"
                  >
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Suggestions</div>
                    {[
                      { label: 'Team', desc: 'Person(s) that share one or more teams in common with employee' },
                      { label: 'Peers', desc: 'Everyone (except the employee) who reports to the same manager' },
                      { label: 'Reports', desc: 'Everyone that reports directly to the employee' },
                      { label: 'All reports', desc: 'Everyone that reports up through the employee' },
                      { label: 'Department', desc: 'Person(s) that share department in common with employee' },
                      { label: 'Location', desc: 'Person(s) that share the same work location as employee' },
                      { label: 'Entity', desc: 'Everyone in the same legal entity as the employee' },
                      { label: 'Title', desc: 'Nearest manager up the reporting chain with the specified title', hasMore: true },
                      { label: 'Level', desc: 'Nearest manager up the reporting chain at or above the specified level', hasMore: true },
                      { label: 'Business partner', desc: 'The employee\'s business partner(s) of the...', hasMore: true },
                      { label: 'Client group', desc: 'The business partner\'s supported employees for the specified business partner group', hasMore: true }
                    ].map(option => (
                      <button 
                        key={option.label}
                        onClick={() => addChip(option.label)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">{option.label}: <span className="font-normal text-gray-500">{option.desc}</span></span>
                        </div>
                        {option.hasMore && <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />}
                      </button>
                    ))}
                    
                    <div className="px-4 py-2 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">The Employee's</div>
                    {[
                      'Manager',
                      'Hired by',
                      'Work location → Employees in location',
                      'Termination info → Direct reports new manager',
                      'Termination info → Termination initiator',
                      'Headcount Allocation → Associated employee',
                      'Headcount Allocation → Backfill for employee',
                      'Application → Referred by',
                      'Application → Employee candidate',
                      'Application → Application recruiter',
                      'Application → Sourcing credit',
                      'Application → Added by',
                      'Candidate application → Referred by',
                      'Current Long-term leave → Processed by'
                    ].map(option => (
                      <button 
                        key={option}
                        onClick={() => addChip(option)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors flex items-center justify-between group"
                      >
                        <span>{option}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                      </button>
                    ))}

                    <div className="px-4 py-2 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">Categories</div>
                    <button 
                      onClick={() => addChip('All... (Managers, Employees, etc.)')}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors flex items-center justify-between group"
                    >
                      <span>All... (Managers, Employees, etc.)</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={handleAddPeople}
              className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
                selectedChips.length > 0 
                ? 'bg-[#7A005D] text-white hover:bg-[#60003D]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Add
            </button>
          </div>
        </div>

        {/* People with access Section */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">People with access</h2>
            <div className="flex items-center gap-4">
              {/* Copy icon now shows in both modes or specifically requested for default */}
              <div className="relative group/tooltip">
                <button className="text-gray-600 hover:text-gray-900"><Copy className="w-5 h-5" /></button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Copy emails for all with access
                </div>
              </div>
              <div className="relative group/tooltip">
                <button className="text-gray-600 hover:text-gray-900"><Mail className="w-5 h-5" /></button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Email all with access
                </div>
              </div>
              <div className="relative group/tooltip">
                <button className="text-gray-600 hover:text-gray-900"><Eye className="w-5 h-5" /></button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Preview all with access
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-visible">
            {/* Table Header */}
            <div className={`grid ${gridCols} px-4 py-3 bg-gray-50/50 border-b border-gray-200 text-sm font-medium text-gray-500`}>
              <div className="text-left">People</div>
              {viewMode === 'advanced' && (
                <div className="flex items-center justify-center gap-1">
                  View as owner <HelpCircle className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex items-center justify-end gap-1 pr-10">
                Access <HelpCircle className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Table Row */}
            {people.map(person => (
              <div key={person.id} className={`grid ${gridCols} px-4 py-4 items-center hover:bg-gray-50 transition-colors group/row relative`}>
                <div className="relative pr-20">
                  <TagsCell names={person.names} role={person.role} />

                  {/* Hover Icons at end of cell */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-0 group-hover/row:opacity-100 transition-opacity z-20 bg-inherit pl-2">
                    <div className="relative group/sub-tooltip">
                      <Pencil className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/sub-tooltip:opacity-100 group-hover/sub-tooltip:visible transition-all whitespace-nowrap shadow-lg border border-gray-200 z-50">
                        Edit
                      </div>
                    </div>
                    <div className="relative group/sub-tooltip">
                      <Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/sub-tooltip:opacity-100 group-hover/sub-tooltip:visible transition-all whitespace-nowrap shadow-lg border border-gray-200 z-50">
                        Preview
                      </div>
                    </div>
                  </div>
                </div>
                
                {viewMode === 'advanced' && (
                  <div className="flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={person.role === 'Owner' || checkedRows.has(person.id)}
                      disabled={person.role === 'Owner'}
                      onChange={() => toggleRowCheckbox(person.id)}
                      className={`w-5 h-5 rounded border-gray-300 accent-[#7A005D] focus:ring-[#7A005D] ${person.role === 'Owner' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 relative w-full">
                  <div className="relative" ref={person.id === activeAccessDropdown ? accessDropdownRef : null}>
                    <button 
                      onClick={() => person.role !== 'Owner' && setActiveAccessDropdown(activeAccessDropdown === person.id ? null : person.id)}
                      className={`flex items-center gap-1 text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors ${person.role === 'Owner' ? 'cursor-default' : 'cursor-pointer'} justify-end`}
                    >
                      <span>{person.role}</span>
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        {person.role !== 'Owner' && <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {/* Access Dropdown */}
                    <AnimatePresence>
                      {activeAccessDropdown === person.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[60]"
                        >
                          <button 
                            onClick={() => updateRole(person.id, 'Editor')}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">Editor</span>
                              {person.role === 'Editor' && <CheckCircle2 className="w-4 h-4 text-[#7A005D]" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Manage access, app navigation, add and remove pages in the app. Same as owner
                            </p>
                          </button>
                          <button 
                            onClick={() => updateRole(person.id, 'Collaborator')}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">Collaborator</span>
                              {person.role === 'Collaborator' && <CheckCircle2 className="w-4 h-4 text-[#7A005D]" />}
                            </div>
                          </button>
                          <button 
                            onClick={() => updateRole(person.id, 'Viewer')}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">Viewer</span>
                              {person.role === 'Viewer' && <CheckCircle2 className="w-4 h-4 text-[#7A005D]" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Access and search the app
                            </p>
                          </button>
                          <div className="border-t border-gray-100 mt-2 pt-2">
                            <button className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium">
                              Add expiration
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-center w-8 shrink-0">
                    {person.role === 'Owner' && (
                      <div className="relative group/swap-tooltip">
                        <button 
                          onClick={() => !isOnlyOwner && setIsTransferModalOpen(true)}
                          className={`p-1 rounded transition-colors ${
                            isOnlyOwner 
                            ? 'text-gray-200 cursor-not-allowed' 
                            : 'text-gray-400 cursor-pointer hover:bg-gray-100 hover:text-gray-600'
                          }`}
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/swap-tooltip:opacity-100 group-hover/swap-tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50 leading-relaxed">
                          {isOnlyOwner 
                            ? "Share with more people or groups to transfer ownership."
                            : "transfer ownership"
                          }
                        </div>
                      </div>
                    )}
                    {person.role !== 'Owner' && (
                      <div className="relative group/delete-tooltip">
                        <button 
                          onClick={() => removePerson(person.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/delete-tooltip:opacity-100 group-hover/delete-tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                          Remove access
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General access Section */}
        {viewMode === 'advanced' && (
          <div className="px-6 py-4 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">General access</h2>
            <div className="border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsGeneralAccessOpen(!isGeneralAccessOpen)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isGeneralAccessOpen ? 'bg-[#7A005D]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isGeneralAccessOpen ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="font-semibold text-gray-900 text-lg">
                    {isGeneralAccessOpen ? 'Open' : 'Restricted'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isGeneralAccessOpen 
                  ? 'bg-purple-50 text-[#7A005D]' 
                  : 'bg-gray-100 text-gray-900'
                }`}>
                  {isGeneralAccessOpen ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isGeneralAccessOpen ? 'Usable by anyone in your org' : 'Usage limited to those with access'}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                When enabled, anyone in your organization can add this Saved Supergroup to any group they can edit but can't make changes
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-6 border-t border-gray-100 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={emailNotification}
              onChange={(e) => setEmailNotification(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 accent-[#7A005D] focus:ring-[#7A005D] cursor-pointer"
            />
            <span className="text-gray-700 font-medium leading-none">Send an e-mail notification to new people</span>
          </label>
          
          <div className="flex gap-3">
            {viewMode === 'advanced' && (
              <button 
                onClick={handleCopyLink}
                className="px-6 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Copy link
              </button>
            )}
            <button className="px-8 py-2.5 bg-[#7A005D] text-white font-semibold rounded-lg hover:bg-[#60003D] transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Add Overlay */}
      <AnimatePresence>
        {isBulkAddOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col"
          >
            {/* Bulk Add Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900">Bulk add individuals</h2>
              <button 
                onClick={() => setIsBulkAddOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Bulk Add Content */}
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="w-full">
                <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                  <p className="text-sm text-gray-600 mb-4">
                    Add people to the group by name, employee ID, work email, or personal email, separated by commas or new lines
                  </p>
                  <div className="relative border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[#7A005D] focus-within:border-transparent transition-all">
                    <textarea 
                      placeholder="Paste details here"
                      className="w-full h-48 p-4 bg-transparent outline-none resize-none text-gray-700 placeholder-gray-400"
                    />
                    <div className="absolute right-4 bottom-4">
                      <button className="px-4 py-1.5 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed text-sm">
                        Import
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Ownership Modal */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto"
            >
              <div className="px-8 pt-8 pb-4">
                <h2 className="text-[28px] font-bold text-gray-900">Transfer Ownership?</h2>
              </div>

              <div className="px-8 pb-8">
                {/* Warning Box */}
                <div className="bg-[#FFEDC2] rounded-2xl p-6 flex gap-4 mb-6">
                  <div className="bg-[#141414] rounded-full p-1.5 h-fit mt-0.5">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[#141414] text-[15px] leading-relaxed">
                    Once the ownership is transferred only the new owner can transfer it again. The new owner will be notified and may remove your access. You may also lose permission to manage sharing settings.
                  </p>
                </div>

                <p className="text-[15px] text-gray-800 mb-4">
                  The new owner must already have access. People without access won't appear in search. People or group with access below:
                </p>

                {/* Current access chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {people.filter(p => p.role !== 'Owner').flatMap(p => p.names).map(tag => (
                    <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 relative" ref={transferSearchRef}>
                  <div 
                    className={`relative flex items-center bg-white border rounded-xl px-4 py-3 transition-all ${
                      isTransferSearchOpen ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/20' : 'border-gray-300'
                    }`}
                  >
                    <input 
                      type="text"
                      value={transferSearch}
                      onChange={(e) => {
                        setTransferSearch(e.target.value);
                        setIsTransferSearchOpen(true);
                      }}
                      onFocus={() => setIsTransferSearchOpen(true)}
                      placeholder="Search employee names"
                      className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-400"
                    />
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTransferSearchOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {isTransferSearchOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[400px] overflow-y-auto py-2"
                      >
                        {transferSearch.trim() === '' ? (
                          <div className="px-4 py-12 text-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-900">
                              <Search className="w-6 h-6 text-gray-900" />
                            </div>
                            <p className="text-gray-900 font-medium text-base">Begin typing to see search results</p>
                          </div>
                        ) : (
                          <>
                            {[...people, ...availablePeople]
                              .filter(p => !p.isGroup) // Strictly only individuals
                              .filter(p => p.role !== 'Owner') // Filter out current owner
                              .filter(p => p.names[0].toLowerCase().includes(transferSearch.toLowerCase()))
                              .reduce((acc, current) => {
                                // Deduplicate by name
                                const x = acc.find(item => item.names[0] === current.names[0]);
                                if (!x) {
                                  return acc.concat([current]);
                                } else {
                                  return acc;
                                }
                              }, [] as Person[])
                              .map((person) => (
                                <button 
                                  key={person.id}
                                  onClick={() => {
                                    setSelectedTransferPerson(person.names[0]);
                                    setTransferSearch(person.names[0]);
                                    setIsTransferSearchOpen(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group border-b border-gray-100 last:border-0"
                                >
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={person.avatar || `https://ui-avatars.com/api/?name=${person.names[0]}&background=random`} 
                                      alt="" 
                                      className="w-10 h-10 rounded-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-[15px] font-medium text-gray-900">{person.names[0]}</span>
                                      <span className="text-xs text-gray-500">{person.title}, {person.department}</span>
                                    </div>
                                  </div>
                                  {selectedTransferPerson === person.names[0] && <CheckCircle2 className="w-5 h-5 text-[#7A005D]" />}
                                </button>
                              ))
                            }
                            {[...people, ...availablePeople].filter(p => !p.isGroup && p.role !== 'Owner').filter(p => p.names[0].toLowerCase().includes(transferSearch.toLowerCase())).length === 0 && (
                              <div className="px-4 py-8 text-center">
                                <p className="text-gray-500 text-sm">No matching people found</p>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-end gap-3 mt-10">
                  <button 
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setTransferSearch('');
                      setSelectedTransferPerson(null);
                    }}
                    className="px-8 py-3 border border-gray-300 text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Go back
                  </button>
                  <button 
                    disabled={!selectedTransferPerson}
                    onClick={handleConfirmTransfer}
                    className={`px-8 py-3 font-bold rounded-xl transition-colors ${
                      selectedTransferPerson 
                      ? 'bg-[#7A005D] text-white hover:bg-[#60003D]' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

