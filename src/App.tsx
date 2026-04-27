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
  Globe,
  Building2,
  Check,
  ArrowLeft,
  ArrowLeftRight,
  HelpCircle,
  Settings,
  ChevronRight,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Search,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/** Matches access dropdown labels (screenshot); stored verbatim in the Access cell */
type AccessLevel =
  | 'Owner'
  | 'Editor'
  | 'Collaborator'
  | 'Viewer'
  | 'View as owner'
  | 'View as viewer'
  | 'Explore as owner';

interface Person {
  id: string;
  names: string[];
  role: AccessLevel;
  isGroup?: boolean;
  title?: string;
  department?: string;
  avatar?: string;
  /** When set, ISO date string YYYY-MM-DD */
  expirationDate?: string | null;
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatExpirationDisplay(iso: string): string {
  const [y, mo, da] = iso.split('-').map(Number);
  const dt = new Date(y, mo - 1, da);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseIsoLocal(iso: string): Date {
  const [y, mo, da] = iso.split('-').map(Number);
  return new Date(y, mo - 1, da);
}

/** Minimal month picker styled like Drive/Gmail (circle highlight on selected day). */
function ExpirationCalendarPopover({
  valueIso,
  onSelect,
  onClose,
}: {
  valueIso: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const selected = parseIsoLocal(valueIso);
  const [viewMonth, setViewMonth] = useState(() =>
    new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstWeekdayMon0 = (new Date(year, month, 1).getDay() + 6) % 7;

  const prevMonth = () =>
    setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(year, month + 1, 1));

  const label = viewMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekdayMon0; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);

  const pick = (day: number) => {
    const d = new Date(year, month, day);
    onSelect(toIsoDate(d));
    onClose();
  };

  const isSelected = (day: number) =>
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-xl border border-gray-100 min-w-[272px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[15px] font-semibold text-gray-900">{label}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 mb-2 text-center text-[11px] font-medium text-gray-500">
        {weekdays.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
        {cells.map((day, idx) =>
          day === null ? (
            <span key={`e-${idx}`} className="h-9" />
          ) : (
            <div key={day} className="flex justify-center items-center h-9">
              <button
                type="button"
                onClick={() => pick(day)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-normal transition-colors ${
                  isSelected(day)
                    ? 'bg-[#ea4335] text-white shadow-sm'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                {day}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Default email verb for `{access type}` placeholder */
function accessVerbForEmail(role: AccessLevel): 'collaborate' | 'edit' {
  if (role === 'Collaborator') return 'collaborate';
  return 'edit';
}

/** Phrase for "you can now …" when multiple recipients may have different access */
function emailAccessPhrase(selected: Person[]): string {
  if (selected.length === 0) return 'edit';
  const verbs = [...new Set(selected.map((p) => accessVerbForEmail(p.role)))];
  if (verbs.length === 1) return verbs[0];
  return 'collaborate or edit based on your access';
}

const ACCESS_GROUPS_ORDER: AccessLevel[] = [
  'Owner',
  'Editor',
  'Collaborator',
  'Viewer',
  'View as owner',
  'View as viewer',
  'Explore as owner',
];

/** Buckets for Choose recipients: merges Viewer + View as viewer → single Viewer group */
type EmailComposerBucket =
  | 'Owner'
  | 'Editor'
  | 'Collaborator'
  | 'Viewer'
  | 'View as owner'
  | 'Explore as owner';

const EMAIL_COMPOSER_BUCKET_ORDER: EmailComposerBucket[] = [
  'Owner',
  'Editor',
  'Collaborator',
  'Viewer',
  'View as owner',
  'Explore as owner',
];

function emailComposerBucket(role: AccessLevel): EmailComposerBucket {
  if (role === 'Viewer' || role === 'View as viewer') return 'Viewer';
  return role as EmailComposerBucket;
}

type GeneralAccessScope = 'restricted' | 'company' | 'anyone_link';
type LinkSharingRole = 'Viewer' | 'Collaborator' | 'Editor';

function generalAccessSubtitle(
  scope: GeneralAccessScope,
  linkRole: LinkSharingRole,
  organizationName: string
): string {
  if (scope === 'restricted') {
    return 'Only people with access can open with this link.';
  }
  if (scope === 'company') {
    if (linkRole === 'Viewer') return `Anyone at ${organizationName} can find and open with the link.`;
    if (linkRole === 'Collaborator') return `Anyone at ${organizationName} with the link can collaborate.`;
    return `Anyone at ${organizationName} with the link can edit.`;
  }
  if (linkRole === 'Viewer') return 'Anyone on the internet with the link can view.';
  if (linkRole === 'Collaborator') return 'Anyone on the internet with the link can collaborate.';
  return 'Anyone on the internet with the link can edit.';
}

/** Demo emails derived from display names (no backend in this UI prototype). */
function deriveEmailFromDisplayName(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'user@company.com';
  if (parts.length === 1) return `${parts[0]}@company.com`;
  return `${parts[0]}.${parts[parts.length - 1]}@company.com`;
}

function emailsForPerson(p: Person): string[] {
  return p.names.map(deriveEmailFromDisplayName);
}

function allAccessEmails(peopleList: Person[]): string[] {
  const set = new Set<string>();
  for (const p of peopleList) {
    emailsForPerson(p).forEach((e) => set.add(e));
  }
  return Array.from(set);
}

export default function App() {
  const [emailNotification, setEmailNotification] = useState(false);
  const [viewMode, setViewMode] = useState<'default' | 'advanced' | 'advanced2'>('advanced2');
  const [generalAccessScope, setGeneralAccessScope] = useState<GeneralAccessScope>('restricted');
  const [generalLinkSharingRole, setGeneralLinkSharingRole] = useState<LinkSharingRole>('Viewer');
  const [generalScopeDropdownOpen, setGeneralScopeDropdownOpen] = useState(false);
  const [generalRoleDropdownOpen, setGeneralRoleDropdownOpen] = useState(false);
  /** Label for the middle option (maps to product “{Company}” scope) */
  const organizationDisplayName = 'Acme Corp';
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [isPreviewAccessOpen, setIsPreviewAccessOpen] = useState(false);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbarMessage(message);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      snackbarTimerRef.current = null;
    }, 3000);
  };
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [activeAccessDropdown, setActiveAccessDropdown] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set(['1']));
  const [sharedFilename] = useState('Quarterly summary');

  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailRecipientIds, setEmailRecipientIds] = useState<Set<string>>(new Set());
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  
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
  const generalScopeDropdownRef = useRef<HTMLDivElement>(null);
  const generalRoleDropdownRef = useRef<HTMLDivElement>(null);
  const expirationCalendarPopoverRef = useRef<HTMLDivElement>(null);

  const [calendarOpenPersonId, setCalendarOpenPersonId] = useState<string | null>(null);

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

    setPeople((prev) => {
      const ownerIdx = prev.findIndex((p) => p.role === 'Owner');
      if (ownerIdx === -1) return prev;

      const targetPerson =
        prev.find((p) => p.names[0] === selectedTransferPerson) ??
        availablePeople.find((p) => p.names[0] === selectedTransferPerson);

      if (!targetPerson || targetPerson.role === 'Owner') return prev;

      const oldOwner = prev[ownerIdx];
      const oldOwnerAsEditor: Person = { ...oldOwner, role: 'Editor' };
      const newOwnerRow: Person = { ...targetPerson, role: 'Owner' };

      const others = prev.filter(
        (p) => p.id !== oldOwner.id && p.id !== targetPerson.id
      );

      return [newOwnerRow, oldOwnerAsEditor, ...others];
    });

    setCheckedRows((prev) => {
      const next = new Set(prev);
      const t =
        people.find((p) => p.names[0] === selectedTransferPerson) ??
        availablePeople.find((p) => p.names[0] === selectedTransferPerson);
      if (t) next.add(t.id);
      return next;
    });

    setIsTransferModalOpen(false);
    setTransferSearch('');
    setSelectedTransferPerson(null);
    showToast('Transfer complete');
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

  // Fake people for search in Advanced 2 mode
  const [searchablePeople] = useState<Person[]>([
    { id: 's1', names: ['Sarah Johnson'], role: 'Editor', isGroup: false, title: 'Product Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 's2', names: ['Michael Chen'], role: 'Viewer', isGroup: false, title: 'Designer', department: 'Design', avatar: 'https://i.pravatar.cc/150?u=michael' },
    { id: 's3', names: ['Jessica Williams'], role: 'Collaborator', isGroup: false, title: 'Data Analyst', department: 'Analytics', avatar: 'https://i.pravatar.cc/150?u=jessica' },
    { id: 's4', names: ['David Brown'], role: 'Viewer', isGroup: false, title: 'Marketing Manager', department: 'Marketing', avatar: 'https://i.pravatar.cc/150?u=david' },
    { id: 's5', names: ['Emily Davis'], role: 'Editor', isGroup: false, title: 'DevOps Engineer', department: 'Engineering', avatar: 'https://i.pravatar.cc/150?u=emily' },
    { id: 's6', names: ['James Martinez'], role: 'Viewer', isGroup: false, title: 'Sales Representative', department: 'Sales', avatar: 'https://i.pravatar.cc/150?u=james' },
    { id: 's7', names: ['Maria Garcia'], role: 'Collaborator', isGroup: false, title: 'HR Manager', department: 'Human Resources', avatar: 'https://i.pravatar.cc/150?u=maria' },
    { id: 's8', names: ['Robert Taylor'], role: 'Viewer', isGroup: false, title: 'Financial Analyst', department: 'Finance', avatar: 'https://i.pravatar.cc/150?u=robert' }
  ]);

  const handleAddPeople = () => {
    if (selectedChips.length === 0 && inputValue.trim() === '') return;
    
    // For advanced2 mode with search input
    if (viewMode === 'advanced2' && inputValue.trim() !== '') {
      // Find person from searchablePeople
      const foundPerson = searchablePeople.find(p => 
        p.names[0].toLowerCase().includes(inputValue.toLowerCase())
      );
      
      if (foundPerson) {
        // Add as individual person
        const newPerson: Person = {
          ...foundPerson,
          id: Math.random().toString(36).substr(2, 9),
        };
        setPeople([...people, newPerson]);
        setInputValue('');
        setIsInputFocused(false);
        return;
      }
    }
    
    // Original behavior for group mode
    if (selectedChips.length > 0) {
      const newEntry: Person = {
        id: Math.random().toString(36).substr(2, 9),
        names: [...selectedChips],
        role: 'Viewer',
        isGroup: true
      };
      setPeople([...people, newEntry]);
      setSelectedChips([]);
    }
  };

  const removePerson = (id: string) => {
    const personToRemove = people.find(p => p.id === id);
    if (personToRemove) {
      setSelectedChips(prev => prev.filter(chip => !personToRemove.names.includes(chip)));
    }
    setPeople(people.filter(p => p.id !== id));
  };

  const updateRole = (id: string, role: AccessLevel) => {
    setPeople(people.map(p => p.id === id ? { ...p, role } : p));
    setActiveAccessDropdown(null);
  };

  const setPersonExpiration = (id: string, iso: string | null) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, expirationDate: iso } : p))
    );
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
      if (
        generalScopeDropdownRef.current &&
        !generalScopeDropdownRef.current.contains(event.target as Node)
      ) {
        setGeneralScopeDropdownOpen(false);
      }
      if (
        generalRoleDropdownRef.current &&
        !generalRoleDropdownRef.current.contains(event.target as Node)
      ) {
        setGeneralRoleDropdownOpen(false);
      }
      if (
        expirationCalendarPopoverRef.current &&
        !expirationCalendarPopoverRef.current.contains(event.target as Node)
      ) {
        setCalendarOpenPersonId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const valid = new Set(people.map((p) => p.id));
    setEmailRecipientIds((prev) => new Set([...prev].filter((id) => valid.has(id))));
  }, [people]);

  const gridCols =
    viewMode === 'advanced'
      ? 'grid-cols-[1fr_120px_minmax(200px,200px)]'
      : viewMode === 'advanced2'
        ? 'grid-cols-[1fr_minmax(200px,200px)]'
        : 'grid-cols-[1fr_minmax(200px,200px)]';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied');
    } catch {
      showToast('Could not copy link');
    }
  };

  const handleCopyAllEmails = async () => {
    const emails = allAccessEmails(people);
    if (emails.length === 0) {
      showToast('No email addresses to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join('\n'));
      showToast('Emails copied to clipboard');
    } catch {
      showToast('Could not copy emails');
    }
  };

  const openEmailComposer = () => {
    if (people.length === 0) {
      showToast('No recipients with access');
      return;
    }
    const all = new Set(people.map((p) => p.id));
    setEmailRecipientIds(all);
    const ownerName = people.find((p) => p.role === 'Owner')?.names.join(', ') ?? '{Username}';
    const selectedList = people.filter((p) => all.has(p.id));
    setEmailCustomMessage(
      `${ownerName} shared ${sharedFilename} with you, you can now ${emailAccessPhrase(selectedList)}`
    );
    setIsEmailComposerOpen(true);
  };

  const sendComposedEmail = () => {
    if (emailRecipientIds.size === 0) return;
    setIsEmailComposerOpen(false);
    showToast(`Message will be sent to ${emailRecipientIds.size} recipient(s)`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-auto">
      {/* Snackbar */}
      <AnimatePresence>
        {snackbarMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] min-w-[280px] max-w-[420px] min-h-[56px] bg-[#C1E9DA] rounded-2xl shadow-lg flex items-center px-4 py-2 justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-[#0D6345] rounded-full p-0.5 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[#003926] font-semibold text-base leading-snug break-words">{snackbarMessage}</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
                setSnackbarMessage(null);
              }}
              className="relative flex items-center justify-center shrink-0"
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
        <button 
          onClick={() => setViewMode('advanced2')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'advanced2' 
            ? 'bg-[#7A005D] text-white shadow-md' 
            : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Advanced 2
        </button>
      </div>

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[744px] border border-gray-200 z-10 relative">
        {isEmailComposerOpen ? (
          <>
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsEmailComposerOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-[#7A005D] hover:bg-gray-100 rounded-lg px-2 py-1.5 -ml-2 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" />
                Back
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 flex-1 text-center pr-10">Choose recipients</h1>
              <button
                type="button"
                onClick={() => setIsEmailComposerOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0 -mr-1"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <p className="text-sm text-gray-500 -mt-2">
                Select people or groups to notify; everyone is selected by default.
              </p>
              <div className="space-y-4 max-h-[min(360px,50vh)] overflow-y-auto pr-1">
                {EMAIL_COMPOSER_BUCKET_ORDER.map((bucket) => {
                  const members = people.filter(
                    (p) => emailComposerBucket(p.role) === bucket
                  );
                  if (members.length === 0) return null;
                  const ids = members.map((m) => m.id);
                  const selectedInBucket = ids.filter((id) =>
                    emailRecipientIds.has(id)
                  ).length;
                  const allInBucket =
                    ids.length > 0 && selectedInBucket === ids.length;
                  const someInBucket = selectedInBucket > 0 && !allInBucket;
                  return (
                    <div key={bucket}>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {bucket.toUpperCase().replace(/\s+/g, ' ')}{' '}
                        <span className="text-gray-400 font-normal normal-case">
                          ({members.length})
                        </span>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer rounded-lg px-2 py-2 hover:bg-gray-50 border border-transparent hover:border-gray-200">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#7A005D] shrink-0"
                          ref={(el) => {
                            if (el) el.indeterminate = someInBucket;
                          }}
                          checked={allInBucket}
                          onChange={() => {
                            setEmailRecipientIds((prev) => {
                              const next = new Set(prev);
                              if (allInBucket) {
                                ids.forEach((id) => next.delete(id));
                              } else {
                                ids.forEach((id) => next.add(id));
                              }
                              return next;
                            });
                          }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-gray-800">
                          {members.map((p) => (
                            <span key={p.id} className="leading-snug">
                              {p.names.join(', ')}
                            </span>
                          ))}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Custom message</label>
                <textarea
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7A005D]/30 focus:border-[#7A005D]"
                  placeholder="Add an optional note…"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEmailComposerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={emailRecipientIds.size === 0}
                  onClick={sendComposedEmail}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-colors ${
                    emailRecipientIds.size === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#7A005D] text-white hover:bg-[#60003D]'
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
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
                    {viewMode === 'advanced2' && inputValue.trim() !== '' ? (
                      // Search results for Advanced 2 when typing
                      <>
                        <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Search Results</div>
                        {searchablePeople
                          .filter(person => 
                            person.names[0].toLowerCase().includes(inputValue.toLowerCase()) ||
                            person.title?.toLowerCase().includes(inputValue.toLowerCase()) ||
                            person.department?.toLowerCase().includes(inputValue.toLowerCase())
                          )
                          .map(person => (
                            <button 
                              key={person.id}
                              onClick={() => {
                                const newPerson: Person = {
                                  ...person,
                                  id: Math.random().toString(36).substr(2, 9),
                                };
                                setPeople([...people, newPerson]);
                                setInputValue('');
                                setIsInputFocused(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                            >
                              <img 
                                src={person.avatar || `https://ui-avatars.com/api/?name=${person.names[0]}&background=random`} 
                                alt="" 
                                className="w-10 h-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{person.names[0]}</span>
                                <span className="text-xs text-gray-500">{person.title}, {person.department}</span>
                              </div>
                            </button>
                          ))}
                        {searchablePeople.filter(person => 
                          person.names[0].toLowerCase().includes(inputValue.toLowerCase()) ||
                          person.title?.toLowerCase().includes(inputValue.toLowerCase()) ||
                          person.department?.toLowerCase().includes(inputValue.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500">No people found</p>
                          </div>
                        )}
                      </>
                    ) : (
                      // Suggestions for all modes (including Advanced 2 when empty)
                      <>
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
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={handleAddPeople}
              className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
                (selectedChips.length > 0 || (viewMode === 'advanced2' && inputValue.trim() !== ''))
                ? 'bg-[#7A005D] text-white hover:bg-[#60003D]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={selectedChips.length === 0 && (viewMode !== 'advanced2' || inputValue.trim() === '')}
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
                <button
                  type="button"
                  onClick={() => void handleCopyAllEmails()}
                  aria-label="Copy emails for all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Copy emails for all with access
                </div>
              </div>
              <div className="relative group/tooltip">
                <button
                  type="button"
                  onClick={openEmailComposer}
                  aria-label="Email all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Mail className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Email all with access
                </div>
              </div>
              <div className="relative group/tooltip">
                <button
                  type="button"
                  onClick={() => setIsPreviewAccessOpen(true)}
                  aria-label="Preview all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 text-gray-900 text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all w-fit whitespace-nowrap shadow-lg border border-gray-200 z-50">
                  Preview all with access
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-visible">
            {/* Table Header */}
            <div className={`grid ${gridCols} px-4 py-3 bg-gray-50/50 border-b border-gray-200 text-sm font-medium text-gray-500`}>
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0">People</span>
                <div className="flex shrink-0 items-center gap-3 text-gray-500">
                  <div className="relative group/col-pencil">
                    <Pencil
                      className="h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                      aria-hidden
                    />
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-900 opacity-0 shadow-lg transition-all invisible group-hover/col-pencil:visible group-hover/col-pencil:opacity-100">
                      Edit
                    </div>
                  </div>
                  <div className="relative group/col-preview">
                    <Eye
                      className="h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                      aria-hidden
                    />
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-900 opacity-0 shadow-lg transition-all invisible group-hover/col-preview:visible group-hover/col-preview:opacity-100">
                      Preview
                    </div>
                  </div>
                </div>
              </div>
              {viewMode === 'advanced' && (
                <div className="flex items-center justify-center gap-1">
                  View as owner <HelpCircle className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex w-full min-w-0 items-center justify-center gap-1 px-2 text-center">
                Access <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              </div>
            </div>

            {/* Table Row */}
            {people.map(person => (
              <div key={person.id} className={`grid ${gridCols} px-4 py-4 items-center hover:bg-gray-50 transition-colors group/row relative`}>
                <div className="flex min-w-0 w-full items-center">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <TagsCell names={person.names} role={person.role} />
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

                <div className="relative flex w-full min-w-0 items-start justify-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="relative flex w-full justify-center"
                      ref={person.id === activeAccessDropdown ? accessDropdownRef : null}
                    >
                      <button 
                        type="button"
                        onClick={() =>
                          setActiveAccessDropdown(activeAccessDropdown === person.id ? null : person.id)
                        }
                        title={person.role}
                        className={`flex max-w-[200px] cursor-pointer items-center gap-0.5 rounded border px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 min-w-0 justify-center ${
                          activeAccessDropdown === person.id
                            ? 'border-[#1a73e8] bg-blue-50/30 ring-1 ring-[#1a73e8]/20'
                            : 'border-transparent hover:border-gray-200'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-center">{person.role}</span>
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center pl-0.5">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>

                      {/* Access Dropdown — same options in every view mode */}
                      <AnimatePresence>
                        {activeAccessDropdown === person.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute left-1/2 top-full z-[60] mt-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white py-2 shadow-2xl"
                          >
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'Owner')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-900">Owner</span>
                                  {person.role === 'Owner' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                                </div>
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'Editor')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-900">Editor</span>
                                  {person.role === 'Editor' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                                </div>
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'Collaborator')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-900">Collaborator</span>
                                  {person.role === 'Collaborator' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                                </div>
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'View as owner')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                              >
                                <span>View as owner</span>
                                {person.role === 'View as owner' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'View as viewer')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                              >
                                <span>View as viewer</span>
                                {person.role === 'View as viewer' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'Explore as owner')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                              >
                                <span>Explore as owner</span>
                                {person.role === 'Explore as owner' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateRole(person.id, 'Viewer')}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-900">Viewer</span>
                                  {person.role === 'Viewer' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                                </div>
                              </button>

                              <div className="border-t border-gray-100 my-2"></div>
                              {person.role === 'Owner' && !person.isGroup && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (!isOnlyOwner) {
                                      setIsTransferModalOpen(true);
                                      setActiveAccessDropdown(null);
                                    }
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium ${
                                    isOnlyOwner ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  Transfer ownership
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => {
                                  if (person.expirationDate) {
                                    setPersonExpiration(person.id, null);
                                  } else {
                                    setPersonExpiration(person.id, toIsoDate(addMonths(new Date(), 1)));
                                  }
                                  setActiveAccessDropdown(null);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium"
                              >
                                {person.expirationDate ? 'Remove expiration' : 'Add expiration'}
                              </button>
                              {person.role !== 'Owner' && (
                                <>
                                  <div className="border-t border-gray-100 my-2"></div>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      removePerson(person.id);
                                      setActiveAccessDropdown(null);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-red-50 text-sm text-red-600 font-medium transition-colors"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {person.expirationDate && (
                      <div className="relative flex max-w-full flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
                        <span className="text-gray-500">Expires</span>
                        <button
                          type="button"
                          title={person.expirationDate}
                          onClick={() =>
                            setCalendarOpenPersonId((cur) =>
                              cur === person.id ? null : person.id
                            )
                          }
                          className="font-semibold text-[#7A005D] hover:underline"
                        >
                          {formatExpirationDisplay(person.expirationDate)}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPersonExpiration(person.id, null);
                            setCalendarOpenPersonId(null);
                          }}
                          className="shrink-0 font-semibold text-[#7A005D] hover:underline"
                        >
                          Remove
                        </button>
                        {calendarOpenPersonId === person.id && (
                          <div
                            ref={expirationCalendarPopoverRef}
                            className="absolute left-1/2 top-full z-[85] mt-2 -translate-x-1/2"
                          >
                            <ExpirationCalendarPopover
                              valueIso={person.expirationDate}
                              onSelect={(iso) => setPersonExpiration(person.id, iso)}
                              onClose={() => setCalendarOpenPersonId(null)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                <div className="flex items-center justify-center w-8 shrink-0 self-start pt-1">
                    {person.role === 'Owner' && viewMode !== 'advanced2' && (
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
                    {person.role !== 'Owner' && viewMode !== 'advanced2' && (
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

        {/* General access — Google Drive–style scope + optional link role */}
        {(viewMode === 'advanced' || viewMode === 'advanced2') && (
          <div className="px-6 py-4 border-t border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 mb-3">General access</h2>
            <div
              ref={generalScopeDropdownRef}
              className="border border-gray-200 rounded-xl bg-[#f8f9fa] overflow-visible"
            >
              <div className="flex items-stretch gap-3 p-3 min-w-0">
                <div
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    generalAccessScope === 'restricted'
                      ? 'bg-[#e8eaed]'
                      : generalAccessScope === 'company'
                        ? 'bg-indigo-100'
                        : 'bg-[#1a7f37]'
                  }`}
                >
                  {generalAccessScope === 'restricted' && (
                    <Lock className="w-[18px] h-[18px] text-[#5f6368]" strokeWidth={2.2} />
                  )}
                  {generalAccessScope === 'company' && (
                    <Building2 className="w-[18px] h-[18px] text-indigo-700" strokeWidth={2} />
                  )}
                  {generalAccessScope === 'anyone_link' && (
                    <Globe className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0 relative">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneralScopeDropdownOpen((o) => !o);
                        setGeneralRoleDropdownOpen(false);
                      }}
                      className="w-full text-left rounded-lg px-0 py-0.5 hover:opacity-90 transition-opacity"
                    >
                      <div className="flex items-start justify-between gap-1 min-w-0">
                        <div className="min-w-0 flex-1 pr-1">
                          <div className="text-[15px] font-medium text-gray-900 leading-tight">
                            {generalAccessScope === 'restricted' && 'Restricted'}
                            {generalAccessScope === 'company' && organizationDisplayName}
                            {generalAccessScope === 'anyone_link' && 'Anyone with the link'}
                          </div>
                          <p className="text-[13px] text-[#5f6368] leading-snug mt-0.5">
                            {generalAccessSubtitle(
                              generalAccessScope,
                              generalLinkSharingRole,
                              organizationDisplayName
                            )}
                          </p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {generalScopeDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 top-full mt-1.5 z-[70] bg-white rounded-xl border border-gray-200 shadow-2xl py-1 overflow-hidden"
                        >
                          {(
                            [
                              { key: 'restricted' as const, listLabel: 'Restricted' },
                              { key: 'company' as const, listLabel: organizationDisplayName },
                              { key: 'anyone_link' as const, listLabel: 'Anyone with the link' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setGeneralAccessScope(opt.key);
                                setGeneralScopeDropdownOpen(false);
                              }}
                              className="w-full px-4 py-2.5 flex items-start gap-3 text-left hover:bg-gray-50"
                            >
                              <span className="mt-0.5 w-5 shrink-0 flex justify-center">
                                {generalAccessScope === opt.key ? (
                                  <Check className="w-5 h-5 text-[#1a73e8]" strokeWidth={2.5} />
                                ) : (
                                  <span className="w-5 h-5 block" />
                                )}
                              </span>
                              <span className="text-[14px] text-gray-900">{opt.listLabel}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {(generalAccessScope === 'company' || generalAccessScope === 'anyone_link') && (
                    <div ref={generalRoleDropdownRef} className="relative shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneralRoleDropdownOpen((o) => !o);
                          setGeneralScopeDropdownOpen(false);
                        }}
                        className="inline-flex items-center gap-0.5 rounded-lg border border-[#1a73e8] bg-white pl-3 pr-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 min-h-[40px] transition-colors"
                      >
                        <span>{generalLinkSharingRole}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      </button>

                      <AnimatePresence>
                        {generalRoleDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[70] overflow-hidden"
                          >
                            <div className="px-4 pb-1.5 pt-0.5 text-[11px] font-semibold text-[#5f6368] uppercase tracking-wide">
                              Role
                            </div>
                            {(['Viewer', 'Collaborator', 'Editor'] as const).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => {
                                  setGeneralLinkSharingRole(role);
                                  setGeneralRoleDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 text-sm font-medium text-gray-900"
                              >
                                <span>{role}</span>
                                {generalLinkSharingRole === role && (
                                  <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" strokeWidth={2.5} />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
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
            {(viewMode === 'advanced' || viewMode === 'advanced2') && (
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
          </>
        )}
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

      {/* Preview all with access — list emails derived from names (demo) */}
      <AnimatePresence>
        {isPreviewAccessOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setIsPreviewAccessOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">People with access</h3>
                <button
                  type="button"
                  onClick={() => setIsPreviewAccessOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-4 space-y-4">
                {people.map((person) => (
                  <div key={person.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="font-medium text-gray-900">{person.names.join(', ')}</div>
                    <div className="text-sm text-gray-500">{person.role}</div>
                    <div className="text-sm text-gray-700 mt-1 break-all">
                      {emailsForPerson(person).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

