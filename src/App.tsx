/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  X, 
  FileUp, 
  Copy, 
  Mail, 
  Eye, 
  Users, 
  Pencil, 
  Lock, 
  ChevronDown, 
  ChevronUp,
  Globe,
  Building2,
  Check,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Ellipsis,
  Type,
  Highlighter,
  Ban,
  AlignLeft,
  List,
  ListOrdered,
  ListChecks,
  Link2,
  Image,
  CirclePlus,
  Zap,
  Info,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SnackbarToneIcon } from './components/SnackbarToneIcon.tsx';
import { PortalMenu } from './components/PortalMenu.tsx';
import { HoverTooltip } from './components/HoverTooltip.tsx';
import {
  DEMO_BULK_DIRECTORY,
  detectBulkIdentifierType,
  findMatchedPerson,
  newBulkImportRowId,
  type BulkDirectoryPerson,
  type BulkIdentifierType,
} from './lib/bulk.ts';
import { inferToastTone, type SnackbarTone } from './lib/snackbarTone.ts';

const bulkDirectory = DEMO_BULK_DIRECTORY;

/** Matches access dropdown labels (screenshot); stored verbatim in the Access cell */
type AccessLevel =
  | 'Owner'
  | 'Editor'
  | 'Collaborator'
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
  'View as owner',
  'View as viewer',
  'Explore as owner',
];

/** Buckets for Choose recipients */
type EmailComposerBucket =
  | 'Owner'
  | 'Editor'
  | 'Collaborator'
  | 'View as viewer'
  | 'View as owner'
  | 'Explore as owner';

const EMAIL_COMPOSER_BUCKET_ORDER: EmailComposerBucket[] = [
  'Owner',
  'Editor',
  'Collaborator',
  'View as viewer',
  'View as owner',
  'Explore as owner',
];

function emailComposerBucket(role: AccessLevel): EmailComposerBucket {
  if (role === 'View as viewer') return 'View as viewer';
  return role as EmailComposerBucket;
}

type GeneralAccessScope = 'restricted' | 'company' | 'anyone_link';
type EmailVariableOption = 'Recipient' | 'Username' | 'Filename' | 'File type' | 'Access type';
type EmailVariableChip = { id: string; option: EmailVariableOption; label: string };
type BulkImportRow = {
  id: string;
  original: string;
  identifierType: BulkIdentifierType;
  matchedPersonId: string | null;
  query: string;
  dropdownOpen: boolean;
};

function generalAccessSubtitle(
  scope: GeneralAccessScope,
  linkRole: AccessLevel,
  organizationName: string
): string {
  if (scope === 'restricted') {
    return 'Only people with access can open with this link.';
  }
  const atCompany = `Anyone at ${organizationName}`;
  const roleVerb =
    linkRole === 'Owner'
      ? 'manage as owner'
      : linkRole === 'Editor'
        ? 'edit'
        : linkRole === 'Collaborator'
          ? 'collaborate'
          : linkRole === 'View as owner'
            ? 'view as owner'
            : linkRole === 'View as viewer'
              ? 'view'
              : 'explore as owner';
  if (scope === 'company') {
    switch (linkRole) {
      case 'Owner':
      case 'Editor':
      case 'Collaborator':
      case 'View as owner':
      case 'View as viewer':
      case 'Explore as owner':
      return `${atCompany} with the link can ${roleVerb}`;
      default:
        return `${atCompany} with the link can collaborate.`;
    }
  }
  switch (linkRole) {
    case 'Owner':
    case 'Editor':
    case 'Collaborator':
    case 'View as owner':
    case 'View as viewer':
    case 'Explore as owner':
      return `Anyone on the internet with the link can ${roleVerb}`;
    default:
      return 'Anyone on the internet with the link can collaborate.';
  }
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
  const [generalLinkAccessRole, setGeneralLinkAccessRole] =
    useState<AccessLevel>('View as viewer');
  const [generalLinkExpirationIso, setGeneralLinkExpirationIso] = useState<string | null>(null);
  const [calendarGeneralLinkOpen, setCalendarGeneralLinkOpen] = useState(false);
  const [generalScopeDropdownOpen, setGeneralScopeDropdownOpen] = useState(false);
  const [generalRoleDropdownOpen, setGeneralRoleDropdownOpen] = useState(false);
  /** Label for the middle option (maps to product “{Company}” scope) */
  const organizationDisplayName = 'Acme Corp';
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarTone, setSnackbarTone] = useState<SnackbarTone>('info');
  const [snackbarStartedAt, setSnackbarStartedAt] = useState<number>(0);
  const [snackbarTick, setSnackbarTick] = useState(0);
  const [previewDrawer, setPreviewDrawer] = useState<{ mode: 'all' | 'row'; personId?: string } | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingTransferPersonId, setPendingTransferPersonId] = useState<string | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbarTone(inferToastTone(message));
    setSnackbarStartedAt(Date.now());
    setSnackbarTick(0);
    setSnackbarMessage(message);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      snackbarTimerRef.current = null;
    }, 5000);
  };
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  useEffect(() => {
    if (typeof process === 'undefined' || process.env.VITEST !== 'true') return;
    const w = window as Window & { __ACCESS_APP_TEST__?: { enqueueToast: (message: string) => void } };
    w.__ACCESS_APP_TEST__ = {
      enqueueToast: (message: string) => {
        showToastRef.current(message);
      },
    };
    return () => {
      delete w.__ACCESS_APP_TEST__;
    };
  }, []);
  const [activeAccessDropdown, setActiveAccessDropdown] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set(['1']));
  const [sharedFilename] = useState('Quarterly summary');

  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailRecipientIds, setEmailRecipientIds] = useState<Set<string>>(new Set());
  const [collapsedRecipientBuckets, setCollapsedRecipientBuckets] = useState<Set<EmailComposerBucket>>(new Set());
  const [emailComposerTab, setEmailComposerTab] = useState<'edit' | 'preview'>('edit');
  const [emailSubject, setEmailSubject] = useState('Harry Porter shared document with you');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [emailBodyHasWord, setEmailBodyHasWord] = useState(true);
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [isVariableMenuOpen, setIsVariableMenuOpen] = useState(false);
  const [bulkInputValue, setBulkInputValue] = useState('');
  const [bulkImportRows, setBulkImportRows] = useState<BulkImportRow[]>([]);
  
  const [people, setPeople] = useState<Person[]>([
    { id: '1', names: ['Harry Porter'], role: 'Owner', isGroup: false, title: 'CEO', department: 'Leadership', avatar: 'https://i.pravatar.cc/150?u=harry' }
  ]);

  /** One-shot layout seed for static screenshots (?demo=sharing-shot); strips the param run-time. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== 'sharing-shot') return;

    const linkExpiry = addMonths(new Date(), 6);
    const linkIso = toIsoDate(linkExpiry);

    setViewMode('advanced2');
    setPeople([
      {
        id: 'shot-row-1',
        names: ['Avery Lee'],
        role: 'Editor',
        isGroup: false,
        title: 'Product Manager',
        department: 'Product',
        avatar: 'https://i.pravatar.cc/120?u=avery-shot',
      },
      {
        id: 'shot-row-2',
        names: ['Noah Kim'],
        role: 'View as viewer',
        isGroup: false,
        title: 'Software Engineer',
        department: 'Engineering',
        avatar: 'https://i.pravatar.cc/120?u=noah-shot',
        expirationDate: linkIso,
      },
    ]);
    setCheckedRows(new Set(['shot-row-1', 'shot-row-2']));
    setGeneralAccessScope('anyone_link');
    setGeneralLinkAccessRole('View as viewer');
    setGeneralLinkExpirationIso(linkIso);
    setSelectedChips(['Taylor Nguyen', 'Riley Patel']);
    setInputValue('Jordan Smith');
    setIsInputFocused(true);

    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const transferSearchRef = useRef<HTMLDivElement>(null);
  const transferRowTriggerRef = useRef<HTMLDivElement | null>(null);
  const peopleRowsScrollRef = useRef<HTMLDivElement>(null);
  const previousPeopleCountRef = useRef(people.length);
  const inputRef = useRef<HTMLDivElement>(null);
  const mainInputMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const accessDropdownMenuRef = useRef<HTMLDivElement>(null);
  const generalScopeDropdownRef = useRef<HTMLDivElement>(null);
  const generalScopeTriggerRef = useRef<HTMLDivElement>(null);
  const generalScopeMenuRef = useRef<HTMLDivElement>(null);
  const generalRoleDropdownRef = useRef<HTMLDivElement>(null);
  const generalRoleMenuListRef = useRef<HTMLDivElement>(null);
  const expirationCalendarPopoverRef = useRef<HTMLDivElement>(null);
  const generalExpirationCalendarPopoverRef = useRef<HTMLDivElement>(null);
  const variableMenuRef = useRef<HTMLDivElement>(null);
  const variableMenuPortalRef = useRef<HTMLDivElement>(null);
  const bulkPeopleWrapRefs = useRef<Partial<Record<string, HTMLDivElement>>>({});
  const expirationDateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const generalLinkExpirationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const draggedChipRef = useRef<HTMLElement | null>(null);

  const [calendarOpenPersonId, setCalendarOpenPersonId] = useState<string | null>(null);

  const bulkImportIdentifierLabel = (() => {
    const types = new Set(bulkImportRows.map((r) => r.identifierType));
    if (types.size === 1) {
      if (types.has('email')) return 'Email';
      if (types.has('employee_id')) return 'Employee ID';
      return 'Name';
    }
    return 'Employee ID / Email / Name';
  })();

  const runBulkImportMatch = () => {
    const parsed = bulkInputValue
      .split(/[\n,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const rows = parsed.map((token) => {
      const identifierType = detectBulkIdentifierType(token);
      const matched = findMatchedPerson(bulkDirectory, token, identifierType);
      return {
        id: newBulkImportRowId(),
        original: token,
        identifierType,
        matchedPersonId: matched?.id ?? null,
        query: '',
        dropdownOpen: false,
      } satisfies BulkImportRow;
    });
    setBulkImportRows(rows);
    setBulkInputValue('');
  };

  const loadCsvDemoRows = () => {
    const csvSeed = [
      'E1001',
      'department@company.com',
      'application.recruiter@company.com',
      'unknown.user@outside.com',
    ].join('\n');
    setBulkInputValue(csvSeed);
    const parsed = csvSeed.split(/[\n,]+/).map((token) => token.trim()).filter(Boolean);
    const rows = parsed.map((token) => {
      const identifierType = detectBulkIdentifierType(token);
      const matched = findMatchedPerson(bulkDirectory, token, identifierType);
      return {
        id: newBulkImportRowId(),
        original: token,
        identifierType,
        matchedPersonId: matched?.id ?? null,
        query: '',
        dropdownOpen: false,
      } satisfies BulkImportRow;
    });
    setBulkImportRows(rows);
    setBulkInputValue('');
  };

  const selectBulkMatchedPerson = (rowId: string, personOption: BulkDirectoryPerson) => {
    let duplicate = false;
    setBulkImportRows((prev) => {
      const alreadyAssigned = prev.some(
        (entry) => entry.id !== rowId && entry.matchedPersonId === personOption.id
      );
      duplicate = alreadyAssigned;
      return prev.map((entry) =>
        entry.id === rowId
          ? {
              ...entry,
              matchedPersonId: personOption.id,
              dropdownOpen: false,
              query: personOption.fullName,
            }
          : entry
      );
    });
    if (duplicate) {
      showToast(`${personOption.fullName} is already matched with another address`);
    }
  };

  // Component for tags cell with overflow detection
  const TagsCell = ({ names }: { names: string[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(1);
    const isSingle = names.length <= 1;

    useLayoutEffect(() => {
      if (isSingle || !measureRef.current || !containerRef.current) return;

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
    }, [isSingle, names]);

    const displayNames = isSingle ? names : names.slice(0, visibleCount);
    const remainingCount = isSingle ? 0 : names.length - visibleCount;

    const measureTag = (name: string, idx: number) => (
      <div
        key={`m-${idx}`}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 py-1 pl-2 pr-1 text-sm"
      >
        <Users className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="max-w-none whitespace-nowrap text-gray-700">{name}</span>
      </div>
    );

    const tagsBody = (
      <div className="relative w-full flex items-center min-h-[30px]" ref={containerRef}>
        {/* Hidden measuring container */}
        {!isSingle && (
          <div 
            ref={measureRef} 
            className="absolute opacity-0 pointer-events-none flex items-center gap-2 flex-nowrap whitespace-nowrap"
            aria-hidden="true"
          >
            {names.map((name, idx) => measureTag(name, idx))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-nowrap overflow-hidden relative w-full">
          {displayNames.map((name, idx) => (
            <div
              key={idx}
              className={`relative flex min-w-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 ${!isSingle ? 'shrink-0' : ''}`}
            >
              <Users className="h-4 w-4 shrink-0 text-gray-400" />
              <span
                className={`min-w-0 flex-1 text-sm text-gray-700 ${!isSingle ? 'truncate' : ''}`}
              >
                {name}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="px-2 py-1 bg-gray-100 rounded-md border border-gray-200 text-sm text-gray-700 font-medium shrink-0">
              +{remainingCount}
            </div>
          )}
        </div>
      </div>
    );

    if (!isSingle && names.length > 1) {
      return (
        <HoverTooltip
          wrapperClassName="block w-full cursor-help"
          placement="top"
          align="start"
          className="w-80 rounded-2xl border border-gray-300 bg-[#F3F4F6] p-4 text-[#1f2937] shadow-2xl"
          content={
            <>
              <div className="text-sm font-bold mb-2">All people/groups:</div>
              <div className="h-[1px] bg-gray-300 mb-3" />
              <div className="flex flex-wrap gap-2">
                {names.map((name, idx) => (
                  <div key={idx} className="bg-[#d1d5db] px-3 py-1.5 rounded-lg text-xs font-medium text-[#1f2937]">
                    {name}
                  </div>
                ))}
              </div>
            </>
          }
        >
          {tagsBody}
        </HoverTooltip>
      );
    }

    return tagsBody;
  };

  const removeNameFromPerson = (id: string, name: string) => {
    setPeople((prev) =>
      prev.flatMap((p) => {
        if (p.id !== id) return [p];
        const nextNames = p.names.filter((n) => n !== name);
        if (nextNames.length === 0) return [];
        return [{ ...p, names: nextNames }];
      })
    );
  };

  const transferOwnershipTo = (targetId: string) => {
    setPeople((prev) => {
      const ownerIdx = prev.findIndex((p) => p.role === 'Owner');
      const targetIdx = prev.findIndex((p) => p.id === targetId);
      if (ownerIdx === -1 || targetIdx === -1) return prev;
      const target = prev[targetIdx];
      if (target.isGroup || target.role === 'Owner') return prev;
      const owner = prev[ownerIdx];
      const ownerAsEditor: Person = { ...owner, role: 'Editor' };
      const targetAsOwner: Person = { ...target, role: 'Owner' };
      const others = prev.filter((p) => p.id !== owner.id && p.id !== target.id);
      return [targetAsOwner, ownerAsEditor, ...others];
    });
    setPendingTransferPersonId(null);
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
    { id: '4', names: ['Brett Rios'], role: 'View as viewer', isGroup: false, title: 'Software Engineer', department: 'Engineering', avatar: 'https://i.pravatar.cc/150?u=brett' },
    { id: '5', names: ['Erika Rodriguez'], role: 'View as viewer', isGroup: false, title: 'Account Executive', department: 'Enterprise', avatar: 'https://i.pravatar.cc/150?u=erika' },
    { id: '6', names: ['Gail Richardson'], role: 'View as viewer', isGroup: false, title: 'Account Executive', department: 'Mid-market', avatar: 'https://i.pravatar.cc/150?u=gail' },
    { id: '7', names: ['Alfred Rivera'], role: 'View as viewer', isGroup: false, title: 'Account Executive', department: 'SMB', avatar: 'https://i.pravatar.cc/150?u=alfred' }
  ]);

  // Fake people for search in Advanced 2 mode
  const [searchablePeople] = useState<Person[]>([
    { id: 's1', names: ['Sarah Johnson'], role: 'Editor', isGroup: false, title: 'Product Manager', department: 'Product', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    { id: 's2', names: ['Michael Chen'], role: 'View as viewer', isGroup: false, title: 'Designer', department: 'Design', avatar: 'https://i.pravatar.cc/150?u=michael' },
    { id: 's3', names: ['Jessica Williams'], role: 'Collaborator', isGroup: false, title: 'Data Analyst', department: 'Analytics', avatar: 'https://i.pravatar.cc/150?u=jessica' },
    { id: 's4', names: ['David Brown'], role: 'View as viewer', isGroup: false, title: 'Marketing Manager', department: 'Marketing', avatar: 'https://i.pravatar.cc/150?u=david' },
    { id: 's5', names: ['Emily Davis'], role: 'Editor', isGroup: false, title: 'DevOps Engineer', department: 'Engineering', avatar: 'https://i.pravatar.cc/150?u=emily' },
    { id: 's6', names: ['James Martinez'], role: 'View as viewer', isGroup: false, title: 'Sales Representative', department: 'Sales', avatar: 'https://i.pravatar.cc/150?u=james' },
    { id: 's7', names: ['Maria Garcia'], role: 'Collaborator', isGroup: false, title: 'HR Manager', department: 'Human Resources', avatar: 'https://i.pravatar.cc/150?u=maria' },
    { id: 's8', names: ['Robert Taylor'], role: 'View as viewer', isGroup: false, title: 'Financial Analyst', department: 'Finance', avatar: 'https://i.pravatar.cc/150?u=robert' }
  ]);

  const handleAddPeople = () => {
    const parsedInput = inputValue
      .split(/[\n,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...selectedChips, ...parsedInput]));
    if (merged.length === 0) return;

    const newEntry: Person = {
      id: Math.random().toString(36).substr(2, 9),
      names: merged,
      role: 'View as viewer',
      isGroup: merged.length > 1,
    };
    setPeople((prev) => [...prev, newEntry]);
    setSelectedChips([]);
    setInputValue('');
    setIsInputFocused(false);
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
      const target = event.target as HTMLElement | null;
      const node = event.target as Node | null;
      if (
        inputRef.current &&
        !inputRef.current.contains(node as Node) &&
        !mainInputMenuRef.current?.contains(node as Node)
      ) {
        setIsInputFocused(false);
      }
      if (
        accessDropdownRef.current &&
        !accessDropdownRef.current.contains(node as Node) &&
        !accessDropdownMenuRef.current?.contains(node as Node)
      ) {
        setActiveAccessDropdown(null);
      }
      if (transferSearchRef.current && !transferSearchRef.current.contains(node as Node)) {
        setEditingRowId(null);
      }
      if (
        generalScopeDropdownRef.current &&
        !generalScopeDropdownRef.current.contains(node as Node) &&
        !generalScopeMenuRef.current?.contains(node as Node)
      ) {
        setGeneralScopeDropdownOpen(false);
      }
      if (
        generalRoleDropdownRef.current &&
        !generalRoleDropdownRef.current.contains(node as Node) &&
        !generalRoleMenuListRef.current?.contains(node as Node)
      ) {
        setGeneralRoleDropdownOpen(false);
      }
      if (
        expirationCalendarPopoverRef.current &&
        !expirationCalendarPopoverRef.current.contains(node as Node)
      ) {
        setCalendarOpenPersonId(null);
      }
      if (
        generalExpirationCalendarPopoverRef.current &&
        !generalExpirationCalendarPopoverRef.current.contains(node as Node)
      ) {
        setCalendarGeneralLinkOpen(false);
      }
      if (
        variableMenuRef.current &&
        !variableMenuRef.current.contains(node as Node) &&
        !variableMenuPortalRef.current?.contains(node as Node)
      ) {
        setIsVariableMenuOpen(false);
      }
      if (!target?.closest('[data-people-selector]') && !target?.closest('[data-bulk-menu]')) {
        setBulkImportRows((prev) =>
          prev.map((row) => ({
            ...row,
            dropdownOpen: false,
            query: row.matchedPersonId ? row.query : '',
          }))
        );
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
    if (!snackbarMessage) return;
    const interval = window.setInterval(() => {
      setSnackbarTick(Date.now());
    }, 100);
    return () => window.clearInterval(interval);
  }, [snackbarMessage]);

  useEffect(() => {
    const valid = new Set(people.map((p) => p.id));
    setEmailRecipientIds((prev) => new Set([...prev].filter((id) => valid.has(id))));
  }, [people]);

  useEffect(() => {
    if (people.length > previousPeopleCountRef.current) {
      const anyOverlayOpen =
        activeAccessDropdown != null ||
        editingRowId != null ||
        generalScopeDropdownOpen ||
        generalRoleDropdownOpen ||
        calendarOpenPersonId != null ||
        calendarGeneralLinkOpen ||
        isVariableMenuOpen ||
        isInputFocused ||
        isBulkAddOpen ||
        bulkImportRows.some((r) => r.dropdownOpen);
      if (!anyOverlayOpen) {
        const el = peopleRowsScrollRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    }
    previousPeopleCountRef.current = people.length;
  }, [
    people.length,
    activeAccessDropdown,
    editingRowId,
    generalScopeDropdownOpen,
    generalRoleDropdownOpen,
    calendarOpenPersonId,
    calendarGeneralLinkOpen,
    isVariableMenuOpen,
    isInputFocused,
    isBulkAddOpen,
    bulkImportRows,
  ]);

  useEffect(() => {
    if (isEmailComposerOpen) setCollapsedRecipientBuckets(new Set());
  }, [isEmailComposerOpen]);

  useEffect(() => {
    const editor = bodyEditorRef.current;
    if (!isEmailComposerOpen || !editor) return;
    if (editor.childNodes.length > 0) return;
    editor.innerHTML = '';
    editor.append(document.createTextNode(emailCustomMessage));
    editor.appendChild(buildVariableChipElement('Access type'));
    refreshBodyWordState();
  }, [isEmailComposerOpen]);

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
    setEmailComposerTab('edit');
    const ownerName = people.find((p) => p.role === 'Owner')?.names[0] ?? 'Harry Porter';
    setEmailSubject(`${ownerName} shared document with you`);
    setEmailCustomMessage(`${ownerName} shared ${sharedFilename} with you, you can now `);
    setEmailBodyHtml('');
    setEmailBodyHasWord(true);
    setIsEmailComposerOpen(true);
  };

  const defaultEmailSubject = () => {
    const ownerName = people.find((p) => p.role === 'Owner')?.names[0] ?? 'Harry Porter';
    return `${ownerName} shared document with you`;
  };

  const defaultEmailBody = () => {
    const ownerName = people.find((p) => p.role === 'Owner')?.names[0] ?? 'Harry Porter';
    return `${ownerName} shared ${sharedFilename} with you, you can now `;
  };

  const buildVariableChipElement = (option: EmailVariableOption): HTMLSpanElement => {
    const ownerName = people.find((p) => p.role === 'Owner')?.names[0] ?? 'Harry Porter';
    const labelMap: Record<EmailVariableOption, string> = {
      Recipient: 'Recipient',
      Username: ownerName,
      Filename: sharedFilename,
      'File type': 'document',
      'Access type': 'Access type',
    };

    const wrapper = document.createElement('span');
    wrapper.className =
      'inline-flex items-center overflow-hidden rounded-md border border-gray-400 align-middle bg-[#FAFAFA] mx-1';
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.setAttribute('draggable', 'true');
    wrapper.dataset.chip = option;

    const left = document.createElement('span');
    left.className = 'px-1.5 py-0.5 text-[14px] text-gray-700';
    left.textContent = '[x]';

    const middle = document.createElement('span');
    middle.className = 'ml-[2px] px-2 py-0.5 text-[14px] text-gray-900';
    middle.textContent = labelMap[option];

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'border-l border-gray-300 px-1.5 py-0.5 text-[16px] leading-none text-gray-700 hover:text-red-600';
    remove.textContent = '×';
    remove.dataset.removeChip = 'true';

    wrapper.append(left, middle, remove);
    return wrapper;
  };

  const getTypedBodyText = () => {
    const editor = bodyEditorRef.current;
    if (!editor) return '';
    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-chip]').forEach((n) => n.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  const refreshBodyWordState = () => {
    const typed = getTypedBodyText();
    setEmailBodyHasWord(/\b\w+\b/.test(typed));
    setEmailBodyHtml(bodyEditorRef.current?.innerHTML ?? '');
  };

  const insertVariableChip = (option: EmailVariableOption) => {
    const editor = bodyEditorRef.current;
    if (!editor) return;
    const chip = buildVariableChipElement(option);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
      editor.appendChild(chip);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    refreshBodyWordState();
    setIsVariableMenuOpen(false);
  };

  const sendComposedEmail = () => {
    if (emailRecipientIds.size === 0) return;
    setIsEmailComposerOpen(false);
    showToast(`Message will be sent to ${emailRecipientIds.size} recipient(s)`);
  };

  const handleMenuArrowNavigation = (
    event: React.KeyboardEvent<HTMLElement>,
    menuRoot: HTMLElement | null
  ) => {
    if (!menuRoot) return;
    const items = Array.from(
      menuRoot.querySelectorAll<HTMLElement>('button[data-menu-item="true"]')
    );
    if (items.length === 0) return;
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
      items[nextIndex]?.focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex =
        activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  };

  const fakeRoster = [
    { username: 'Avery Lee', role: 'Product Manager', avatar: 'https://i.pravatar.cc/120?u=avery' },
    { username: 'Noah Kim', role: 'Software Engineer', avatar: 'https://i.pravatar.cc/120?u=noah' },
    { username: 'Riley Patel', role: 'Data Analyst', avatar: 'https://i.pravatar.cc/120?u=riley' },
    { username: 'Jordan Smith', role: 'Designer', avatar: 'https://i.pravatar.cc/120?u=jordan' },
    { username: 'Taylor Nguyen', role: 'Operations', avatar: 'https://i.pravatar.cc/120?u=taylor' },
    { username: 'Skyler Brown', role: 'Legal', avatar: 'https://i.pravatar.cc/120?u=skyler' },
    { username: 'Casey Johnson', role: 'Sales', avatar: 'https://i.pravatar.cc/120?u=casey' },
    { username: 'Morgan Davis', role: 'Finance', avatar: 'https://i.pravatar.cc/120?u=morgan' },
  ];

  const previewRows = (() => {
    if (!previewDrawer) return [] as { username: string; role: string; accessType: AccessLevel; avatar: string }[];
    const targetPerson =
      previewDrawer.mode === 'row'
        ? people.find((p) => p.id === previewDrawer.personId)
        : null;
    const accessType = targetPerson?.role ?? generalLinkAccessRole;
    const count = previewDrawer.mode === 'row' ? 5 : 8;
    return fakeRoster.slice(0, count).map((entry) => ({
      username: entry.username,
      role: entry.role,
      accessType,
      avatar: entry.avatar,
    }));
  })();

  const snackbarElapsedMs = snackbarMessage
    ? Math.min(5000, Math.max(0, (snackbarTick || Date.now()) - snackbarStartedAt))
    : 0;
  const snackbarProgressDeg = (snackbarElapsedMs / 5000) * 360;
  const bulkHasEmptyIdentifier = bulkImportRows.some((row) => row.original.trim() === '');
  const bulkHasMatchConflict = bulkImportRows.some(
    (row, _, arr) =>
      !!row.matchedPersonId &&
      arr.filter((entry) => entry.matchedPersonId === row.matchedPersonId).length > 1
  );
  const canCommitBulkAdd =
    bulkImportRows.length > 0 && !bulkHasEmptyIdentifier && !bulkHasMatchConflict;
  const visibleRecipientBuckets = EMAIL_COMPOSER_BUCKET_ORDER.filter((bucket) =>
    people.some((p) => emailComposerBucket(p.role) === bucket)
  );
  const areAllRecipientBucketsCollapsed =
    visibleRecipientBuckets.length > 0 &&
    visibleRecipientBuckets.every((bucket) => collapsedRecipientBuckets.has(bucket));

  useEffect(() => {
    if (!isEmailComposerOpen || emailComposerTab !== 'edit') return;
    const editor = bodyEditorRef.current;
    if (!editor) return;
    const text = editor.textContent?.trim() ?? '';
    if (!text && !editor.querySelector('[data-chip]')) {
      editor.innerHTML = '';
      editor.append(document.createTextNode(defaultEmailBody()));
      editor.appendChild(buildVariableChipElement('Access type'));
      refreshBodyWordState();
    }
  }, [emailComposerTab, isEmailComposerOpen]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-auto">
      {/* Snackbar */}
      <AnimatePresence>
        {snackbarMessage && (
          <motion.div 
            data-snackbar-root
            data-snackbar-tone={snackbarTone}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[360px] h-[56px] rounded-2xl shadow-[0_14px_28px_rgba(0,0,0,0.35)] flex items-center px-4 py-2 justify-between gap-3 border ${
              snackbarTone === 'success'
                ? 'bg-[#BDEAE3] border-[#9DD7CB]'
                : snackbarTone === 'warning'
                  ? 'bg-[#FCE9B0] border-[#E9CC73]'
                  : snackbarTone === 'error'
                    ? 'bg-[#F8C7C3] border-[#E59E97]'
                    : 'bg-[#C9D7EF] border-[#B5C4DF]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`rounded-full p-1.5 shrink-0 ${
                  snackbarTone === 'success'
                    ? 'bg-[#0D7B62]'
                    : snackbarTone === 'warning'
                      ? 'bg-[#E2A100]'
                      : snackbarTone === 'error'
                        ? 'bg-[#C74431]'
                        : 'bg-[#4A67A1]'
                }`}
              >
                <SnackbarToneIcon tone={snackbarTone} className="w-4 h-4 text-white" />
              </div>
              <span
                className={`font-semibold text-sm leading-snug truncate ${
                  snackbarTone === 'success'
                    ? 'text-[#0A4538]'
                    : snackbarTone === 'warning'
                      ? 'text-[#5B4200]'
                      : snackbarTone === 'error'
                        ? 'text-[#4D1612]'
                        : 'text-[#1B2A44]'
                }`}
              >
                {snackbarMessage}
              </span>
            </div>
            <button 
              type="button"
              onClick={() => {
                if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
                setSnackbarMessage(null);
              }}
              className="relative flex items-center justify-center shrink-0 w-7 h-7"
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${
                    snackbarTone === 'success'
                      ? '#0D7B62'
                      : snackbarTone === 'warning'
                        ? '#E2A100'
                        : snackbarTone === 'error'
                          ? '#C74431'
                          : '#4A67A1'
                  } ${snackbarProgressDeg}deg, rgba(255,255,255,0.45) 0deg)`,
                }}
              />
              <div className="absolute inset-[2px] bg-white/80 rounded-full" />
              <div
                className={`relative rounded-full p-1 ${
                  snackbarTone === 'success'
                    ? 'bg-[#0D7B62]'
                    : snackbarTone === 'warning'
                      ? 'bg-[#E2A100]'
                      : snackbarTone === 'error'
                        ? 'bg-[#C74431]'
                        : 'bg-[#4A67A1]'
                }`}
              >
                <X className="w-3.5 h-3.5 text-white" />
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
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-[744px] border border-gray-200 z-10 relative flex max-h-[960px] flex-col overflow-hidden ${
          isEmailComposerOpen ? 'min-h-[min(760px,85vh)]' : ''
        }`}
      >
        {isEmailComposerOpen ? (
          <>
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsEmailComposerOpen(false)}
                className="flex items-center gap-1 text-sm font-medium text-[#7A005D] hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                Back
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 flex-1 text-center pr-10">Email recipients</h1>
              <button
                type="button"
                onClick={() => setIsEmailComposerOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0 -mr-1"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-6">
              <div className="shrink-0 -mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Select people or groups to notify; everyone is selected by default.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (areAllRecipientBucketsCollapsed) {
                      setCollapsedRecipientBuckets(new Set());
                      return;
                    }
                    setCollapsedRecipientBuckets(new Set(visibleRecipientBuckets));
                  }}
                  className="text-sm font-medium text-[#7A005D] hover:underline"
                >
                  {areAllRecipientBucketsCollapsed ? 'View all recipients' : 'Collapse all recipients'}
                </button>
              </div>
              <div className="space-y-4 shrink-0 pr-1">
                {visibleRecipientBuckets.map((bucket) => {
                  const members = people.filter(
                    (p) => emailComposerBucket(p.role) === bucket
                  );
                  const itemCount = members.reduce((sum, p) => sum + p.names.length, 0);
                  const ids = members.map((m) => m.id);
                  const selectedInBucket = ids.filter((id) =>
                    emailRecipientIds.has(id)
                  ).length;
                  const allInBucket =
                    ids.length > 0 && selectedInBucket === ids.length;
                  const someInBucket = selectedInBucket > 0 && !allInBucket;
                  const isCollapsed = collapsedRecipientBuckets.has(bucket);
                  return (
                    <div key={bucket}>
                      <button
                        type="button"
                        className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
                        onClick={() =>
                          setCollapsedRecipientBuckets((prev) => {
                            const next = new Set(prev);
                            if (next.has(bucket)) next.delete(bucket);
                            else next.add(bucket);
                            return next;
                          })
                        }
                      >
                        <span>
                          {bucket.toUpperCase().replace(/\s+/g, ' ')}{' '}
                          <span className="text-gray-400 font-normal normal-case">
                            ({itemCount})
                          </span>
                        </span>
                        {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      </button>
                      {!isCollapsed && (
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
                        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-gray-800">
                          {members.flatMap((p) => p.names).join(', ') || ''}
                        </span>
                      </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                <div className="inline-flex h-10 w-[200px] max-w-full items-center rounded-xl border border-gray-300 p-0.5">
                  <button
                    type="button"
                    onClick={() => setEmailComposerTab('edit')}
                    className={`h-full w-1/2 rounded-l-lg px-4 text-sm font-semibold transition-colors ${
                      emailComposerTab === 'edit'
                        ? 'bg-[#8b0069] text-white'
                        : 'bg-white text-[#475467] hover:bg-gray-50'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      refreshBodyWordState();
                      setEmailComposerTab('preview');
                    }}
                    className={`h-full w-1/2 rounded-r-lg px-4 text-sm font-semibold transition-colors ${
                      emailComposerTab === 'preview'
                        ? 'bg-[#8b0069] text-white'
                        : 'bg-white text-[#475467] hover:bg-gray-50'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                {emailComposerTab === 'edit' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-gray-900">
                        Subject<span className="text-red-500">*</span>
                      </label>
                      <input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        onBlur={() => {
                          if (emailSubject.trim() === '') setEmailSubject(defaultEmailSubject());
                        }}
                        className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7A005D]/25 focus:border-[#7A005D]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[14px] font-semibold text-gray-900">
                        Body<span className="text-red-500">*</span>
                      </label>
                      <div className="rounded-lg border border-gray-300">
                  <div className="border-b border-gray-300 px-4 py-2.5 text-base text-gray-700">
                    <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="hover:text-gray-900"><Undo2 className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Redo2 className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="hover:text-gray-900"><Bold className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Italic className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Ellipsis className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="hover:text-gray-900"><Type className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Highlighter className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Ban className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="text-sm px-3 py-1 rounded-lg border border-gray-300 bg-white">Normal text</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="hover:text-gray-900">−</button>
                    <button type="button" className="text-sm px-2 py-1 rounded-lg border border-gray-300 bg-white">15</button>
                    <button type="button" className="hover:text-gray-900">+</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="hover:text-gray-900"><AlignLeft className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><List className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><ListOrdered className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><ListChecks className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="hover:text-gray-900"><Link2 className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><Image className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-gray-900"><CirclePlus className="w-5 h-5" /></button>
                    <div className="relative" ref={variableMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsVariableMenuOpen((o) => !o)}
                        className="inline-flex items-center gap-1 text-sm px-4 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700"
                      >
                        <Zap className="w-4 h-4" />
                        Insert variable
                      </button>
                      <PortalMenu
                        open={isVariableMenuOpen}
                        triggerRef={variableMenuRef}
                        menuRef={variableMenuPortalRef}
                        placement="bottom"
                        align="end"
                        width={192}
                        offset={8}
                        className="max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                        onRequestClose={() => setIsVariableMenuOpen(false)}
                      >
                        {(['Recipient', 'Username', 'Filename', 'File type', 'Access type'] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => insertVariableChip(option)}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                          >
                            {option}
                          </button>
                        ))}
                      </PortalMenu>
                    </div>
                    </div>
                  </div>

                  <div className="h-[160px] min-h-[160px] resize-y overflow-auto p-4 text-sm text-gray-800">
                    <div
                      ref={bodyEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[120px] w-full outline-none leading-relaxed"
                      onInput={() => refreshBodyWordState()}
                      onBlur={() => refreshBodyWordState()}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.dataset.removeChip === 'true') {
                          e.preventDefault();
                          target.closest('[data-chip]')?.remove();
                          refreshBodyWordState();
                        }
                      }}
                      onDragStart={(e) => {
                        const target = (e.target as HTMLElement).closest('[data-chip]') as HTMLElement | null;
                        if (!target) return;
                        draggedChipRef.current = target;
                        e.dataTransfer.setData('text/plain', target.dataset.chip ?? '');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const editor = bodyEditorRef.current;
                        if (!editor) return;
                        const doc = editor.ownerDocument;
                        const range =
                          (doc as any).caretRangeFromPoint?.(e.clientX, e.clientY) ??
                          (() => {
                            const pos = (doc as any).caretPositionFromPoint?.(e.clientX, e.clientY);
                            if (!pos) return null;
                            const r = doc.createRange();
                            r.setStart(pos.offsetNode, pos.offset);
                            r.collapse(true);
                            return r;
                          })();
                        if (!range) return;
                        const chip = draggedChipRef.current;
                        if (chip) {
                          range.insertNode(chip);
                          range.setStartAfter(chip);
                          range.collapse(true);
                          const sel = window.getSelection();
                          sel?.removeAllRanges();
                          sel?.addRange(range);
                        }
                        draggedChipRef.current = null;
                        refreshBodyWordState();
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    ></div>
                  </div>
                </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-[#F8FAFC] p-6">
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Subject</div>
                    <div className="mt-2 text-[20px] font-semibold text-[#111827]">{emailSubject || defaultEmailSubject()}</div>
                    <div className="my-4 h-px bg-gray-200" />
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Message</div>
                    <div className="mt-3 text-[16px] leading-relaxed text-[#111827]">
                      <div dangerouslySetInnerHTML={{ __html: emailBodyHtml || `${defaultEmailBody()}<br/>• {Document names}` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                type="button"
                disabled={emailRecipientIds.size === 0 || !emailBodyHasWord}
                onClick={sendComposedEmail}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-colors ${
                  emailRecipientIds.size === 0 || !emailBodyHasWord
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#7A005D] text-white hover:bg-[#60003D]'
                }`}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <>
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Sharing access
          </h1>
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Add People Section */}
        <div className="shrink-0 px-6 pb-6 border-b border-gray-100">
          <div className="flex gap-3 items-start">
            <div className="relative flex-1" ref={inputRef}>
              <div 
                className={`w-full min-h-[44px] max-h-[480px] overflow-y-auto p-1.5 pr-12 bg-white border border-gray-300 rounded-lg flex flex-wrap gap-2 transition-all ${
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
                  onKeyDown={(e) => {
                    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isInputFocused) {
                      e.preventDefault();
                      requestAnimationFrame(() => {
                        const menu = document.getElementById('main-input-menu');
                        const firstItem = menu?.querySelector<HTMLElement>('button[data-menu-item="true"]');
                        firstItem?.focus();
                      });
                    }
                  }}
                  className="flex-1 min-w-[120px] py-1 pl-2 bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              
              <div className="absolute right-2 top-2 flex items-center gap-1" ref={moreMenuRef}>
                <HoverTooltip
                  placement="top"
                  align="end"
                  wrapperClassName="inline-flex items-center"
                  className="w-72 rounded-xl border border-gray-300 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                  content="Bulk add a list of employees using names, IDs, or email addresses"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBulkAddOpen(true);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
                    aria-label="Bulk add list"
                  >
                    <FileUp className="w-5 h-5" />
                  </button>
                </HoverTooltip>
              </div>

              {/* Input Dropdown */}
              <PortalMenu
                open={isInputFocused}
                triggerRef={inputRef}
                menuRef={mainInputMenuRef}
                id="main-input-menu"
                placement="bottom"
                align="start"
                width="trigger"
                offset={4}
                className="max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
                onRequestClose={() => setIsInputFocused(false)}
              >
                    <div onKeyDown={(e) => handleMenuArrowNavigation(e, e.currentTarget)}>
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
                              data-menu-item="true"
                              onClick={() => {
                                addChip(person.names[0]);
                                setInputValue('');
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
                            data-menu-item="true"
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
                            data-menu-item="true"
                            onClick={() => addChip(option)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors flex items-center justify-between group"
                          >
                            <span>{option}</span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                          </button>
                        ))}

                        <div className="px-4 py-2 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 bg-gray-50">Categories</div>
                        <button 
                          data-menu-item="true"
                          onClick={() => addChip('All... (Managers, Employees, etc.)')}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors flex items-center justify-between group"
                        >
                          <span>All... (Managers, Employees, etc.)</span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                        </button>
                      </>
                    )}
                    </div>
              </PortalMenu>
            </div>
            <button 
              onClick={handleAddPeople}
              className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
                (selectedChips.length > 0 || inputValue.trim() !== '')
                ? 'bg-[#7A005D] text-white hover:bg-[#60003D]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={selectedChips.length === 0 && inputValue.trim() === ''}
            >
              Add
            </button>
          </div>
        </div>

        {/* People with access Section */}
        <div ref={peopleRowsScrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-0">
          <div className="rounded-xl border border-gray-200 overflow-visible">
            <div className="sticky top-0 z-[1250] bg-white">
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">People with access</h2>
                  <HoverTooltip
                    placement="top"
                    align="start"
                    wrapperClassName="inline-flex shrink-0 items-center"
                    className="max-w-xs whitespace-normal rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-left text-xs font-medium leading-snug text-gray-900 shadow-lg"
                    content="If a person or group is added multiple times, the most permissive sharing access will apply."
                  >
                    <button
                      type="button"
                      className="text-gray-400 outline-none hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#7A005D]/30 rounded"
                      aria-label="How sharing applies when duplicates exist"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </HoverTooltip>
                </div>
                <div className="flex shrink-0 items-center gap-4">
              <HoverTooltip
                placement="top"
                align="center"
                wrapperClassName="inline-flex items-center"
                className="w-fit whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                content="Copy emails for all with access"
              >
                <button
                  type="button"
                  onClick={() => void handleCopyAllEmails()}
                  aria-label="Copy emails for all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </HoverTooltip>
              <HoverTooltip
                placement="top"
                align="center"
                wrapperClassName="inline-flex items-center"
                className="w-fit whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                content="Email all with access"
              >
                <button
                  type="button"
                  onClick={openEmailComposer}
                  aria-label="Email all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Mail className="w-5 h-5" />
                </button>
              </HoverTooltip>
              <HoverTooltip
                placement="top"
                align="center"
                wrapperClassName="inline-flex items-center"
                className="w-fit whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                content="Preview all with access"
              >
                <button
                  type="button"
                  onClick={() => setPreviewDrawer({ mode: 'all' })}
                  aria-label="Preview all with access"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Eye className="w-5 h-5" />
                </button>
                </HoverTooltip>
                </div>
              </div>

            <div className={`grid ${gridCols} gap-x-10 border-b border-gray-200 bg-gray-50/95 px-3 py-[8px] text-sm font-medium leading-5 text-gray-500 backdrop-blur-sm`}>
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0">People</span>
              </div>
              {viewMode === 'advanced' && (
                <div className="flex items-center justify-start gap-1 text-left">
                  View as owner <HelpCircle className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex w-full min-w-0 items-center justify-start gap-1 text-left">
                Access <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              </div>
            </div>
            </div>

            {/* Table Row */}
            {people.map(person => (
              <div key={person.id} className={`grid ${gridCols} gap-x-10 px-3 py-4 items-center hover:bg-gray-50 transition-colors group/row relative`}>
                <div
                  className="flex min-w-0 w-full items-center"
                  ref={editingRowId === person.id ? transferRowTriggerRef : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <TagsCell names={person.names} />
                  </div>
                  <div className="relative ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                    <HoverTooltip
                      placement="top"
                      align="center"
                      wrapperClassName="inline-flex items-center"
                      className="whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                      content="Edit"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRowId((cur) => (cur === person.id ? null : person.id))
                        }
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Edit groups in this row"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </HoverTooltip>
                    <HoverTooltip
                      placement="top"
                      align="center"
                      wrapperClassName="inline-flex items-center"
                      className="whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                      content="Preview"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewDrawer({ mode: 'row', personId: person.id })}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Preview people included in this row"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </HoverTooltip>
                  </div>
                  {editingRowId === person.id && (
                    <PortalMenu
                      open
                      triggerRef={transferRowTriggerRef}
                      menuRef={transferSearchRef}
                      placement="bottom"
                      align="start"
                      width={320}
                      offset={8}
                      nudgeX={16}
                      className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
                      onRequestClose={() => setEditingRowId(null)}
                    >
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Remove group/person from this row
                      </div>
                      <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
                        {person.names.map((name) => (
                          <div
                            key={name}
                            className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5"
                          >
                            <span className="truncate text-sm text-gray-800">{name}</span>
                            <button
                              type="button"
                              onClick={() => removeNameFromPerson(person.id, name)}
                              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                              aria-label={`Remove ${name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </PortalMenu>
                  )}
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

                <div className="relative flex w-full min-w-0 items-start justify-start gap-4">
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
                    <div className="relative flex w-full justify-start" ref={person.id === activeAccessDropdown ? accessDropdownRef : null}>
                      {person.role === 'Owner' ? (
                        <div className="flex max-w-[200px] items-center rounded py-1 text-sm text-gray-700 min-w-0 justify-start text-left">
                          <span className="min-w-0 flex-1 truncate text-left">Owner</span>
                        </div>
                      ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAccessDropdown(activeAccessDropdown === person.id ? null : person.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveAccessDropdown(person.id);
                            requestAnimationFrame(() => {
                              const menu = accessDropdownMenuRef.current;
                              const firstItem = menu?.querySelector<HTMLElement>('button[data-menu-item="true"]');
                              firstItem?.focus();
                            });
                          }
                        }}
                        title={person.role}
                        className={`flex max-w-[200px] cursor-pointer items-center gap-0.5 rounded border py-1 text-sm text-gray-700 transition-colors min-w-0 justify-start text-left ${
                          activeAccessDropdown === person.id
                            ? 'border-[#1a73e8] bg-blue-50/30 ring-1 ring-[#1a73e8]/20'
                            : 'border-transparent'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">{person.role}</span>
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center pl-0.5">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                      )}

                      {/* Access Dropdown — same options in every view mode */}
                      {activeAccessDropdown === person.id && person.role !== 'Owner' && (
                        <PortalMenu
                          open
                          triggerRef={accessDropdownRef}
                          menuRef={accessDropdownMenuRef}
                          placement="bottom"
                          align="start"
                          width={288}
                          offset={8}
                          className="max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 pb-6 shadow-2xl"
                          onRequestClose={() => setActiveAccessDropdown(null)}
                        >
                          <div onKeyDown={(e) => handleMenuArrowNavigation(e, e.currentTarget)}>
                            <button 
                              type="button"
                              onClick={() => updateRole(person.id, 'Editor')}
                              data-menu-item="true"
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
                              data-menu-item="true"
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
                              data-menu-item="true"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                            >
                              <span>View as owner</span>
                              {person.role === 'View as owner' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateRole(person.id, 'View as viewer')}
                              data-menu-item="true"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                            >
                              <span>View as viewer</span>
                              {person.role === 'View as viewer' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => updateRole(person.id, 'Explore as owner')}
                              data-menu-item="true"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium flex items-center justify-between gap-2"
                            >
                              <span>Explore as owner</span>
                              {person.role === 'Explore as owner' && <CheckCircle2 className="w-4 h-4 text-[#7A005D] shrink-0" />}
                            </button>
                            <div className="border-t border-gray-100 my-2"></div>
                            {person.role !== 'Owner' && !person.isGroup && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setPendingTransferPersonId(person.id);
                                  setActiveAccessDropdown(null);
                                }}
                                data-menu-item="true"
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium"
                              >
                                Transfer ownership
                              </button>
                            )}
                            {person.role !== 'Owner' && (
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
                              data-menu-item="true"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-gray-900 font-medium"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {person.expirationDate ? 'Remove expiration' : 'Add expiration'}
                                <HoverTooltip
                                  placement="bottom"
                                  align="start"
                                  delay={0}
                                  wrapperClassName="inline-flex"
                                  className="h-auto w-[340px] whitespace-normal break-words rounded-lg border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700 shadow-xl"
                                  content='Once access expires, this group will no longer be able to access the document. If the artifact is currently set to "Company-wide" or "Anyone with the link," it will automatically switch to "Restricted" after expiration.'
                                >
                                  <span
                                    className="inline-flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                                  </span>
                                </HoverTooltip>
                              </span>
                            </button>
                            )}
                            {person.role !== 'Owner' && (
                              <>
                                <div className="border-t border-gray-100 my-2"></div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    removePerson(person.id);
                                    setActiveAccessDropdown(null);
                                  }}
                                  data-menu-item="true"
                                  className="w-full px-4 py-3 text-left hover:bg-red-50 text-sm text-red-600 font-medium transition-colors"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </PortalMenu>
                      )}
                    </div>

                    {person.expirationDate && (
                      <div className="relative mt-[2px] flex w-full items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Expires</span>
                          <button
                            type="button"
                            ref={calendarOpenPersonId === person.id ? expirationDateTriggerRef : undefined}
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
                        </div>
                        <HoverTooltip
                          placement="top"
                          align="center"
                          className="whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                          content="Remove"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setPersonExpiration(person.id, null);
                              setCalendarOpenPersonId(null);
                            }}
                            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-[#DC2626]"
                            aria-label="Remove expiration"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </HoverTooltip>
                        {calendarOpenPersonId === person.id && (
                          <PortalMenu
                            open
                            triggerRef={expirationDateTriggerRef}
                            menuRef={expirationCalendarPopoverRef}
                            placement="bottom"
                            align="start"
                            width={288}
                            offset={8}
                            onRequestClose={() => setCalendarOpenPersonId(null)}
                          >
                            <ExpirationCalendarPopover
                              valueIso={person.expirationDate}
                              onSelect={(iso) => setPersonExpiration(person.id, iso)}
                              onClose={() => setCalendarOpenPersonId(null)}
                            />
                          </PortalMenu>
                        )}
                      </div>
                    )}
                  </div>
                <div className="flex items-center justify-center w-8 shrink-0 self-start pt-1">
                    {person.role !== 'Owner' && viewMode !== 'advanced2' && (
                      <HoverTooltip
                        placement="top"
                        align="end"
                        className="mb-0 w-fit whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                        content="Remove access"
                      >
                        <button 
                          onClick={() => removePerson(person.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </HoverTooltip>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General access — Google Drive–style scope + optional link role */}
        {(viewMode === 'advanced' || viewMode === 'advanced2') && (
          <div className="shrink-0 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">General access</h2>
            <div
              ref={generalScopeDropdownRef}
              className="overflow-visible"
            >
              <div className="flex items-stretch gap-3 py-2 min-w-0">
                <div
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    generalAccessScope === 'restricted'
                      ? 'bg-[#e8eaed]'
                      : generalAccessScope === 'company'
                        ? 'bg-indigo-100'
                        : 'bg-[#c8e6c9]'
                  }`}
                >
                  {generalAccessScope === 'restricted' && (
                    <Lock className="w-[18px] h-[18px] text-[#5f6368]" strokeWidth={2.2} />
                  )}
                  {generalAccessScope === 'company' && (
                    <Building2 className="w-[18px] h-[18px] text-indigo-700" strokeWidth={2} />
                  )}
                  {generalAccessScope === 'anyone_link' && (
                    <Globe className="w-[18px] h-[18px] text-[#2e7d32]" strokeWidth={2.2} />
                  )}
                </div>
                <div className="flex-1 flex items-start gap-4 min-w-0">
                  <div className="flex-1 min-w-0 relative" ref={generalScopeTriggerRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setGeneralScopeDropdownOpen((o) => !o);
                        setGeneralRoleDropdownOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          setGeneralScopeDropdownOpen(true);
                          requestAnimationFrame(() => {
                            const menu = generalScopeMenuRef.current;
                            const firstItem = menu?.querySelector<HTMLElement>('button[data-menu-item="true"]');
                            firstItem?.focus();
                          });
                        }
                      }}
                      className="w-full text-left rounded-lg px-0 py-0.5 hover:opacity-90 transition-opacity"
                    >
                      <div className="flex items-start justify-between gap-1 min-w-0">
                        <div className="min-w-0 flex-1 pr-1">
                          <div className="flex items-center gap-1 text-[15px] font-semibold text-gray-900 leading-tight">
                            <span>
                              {generalAccessScope === 'restricted' && 'Restricted'}
                              {generalAccessScope === 'company' && organizationDisplayName}
                              {generalAccessScope === 'anyone_link' && 'Anyone with the link'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                          </div>
                          <p className="text-[13px] text-[#5f6368] leading-snug mt-0.5">
                            {generalAccessSubtitle(
                              generalAccessScope,
                              generalLinkAccessRole,
                              organizationDisplayName
                            )}
                          </p>
                          {generalLinkExpirationIso && (
                            <div className="relative mt-[2px] flex items-center gap-2 whitespace-nowrap text-[13px] text-[#5f6368]">
                              <span>Expires</span>
                              <button
                                type="button"
                                ref={generalLinkExpirationTriggerRef}
                                title={generalLinkExpirationIso}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCalendarGeneralLinkOpen((o) => !o);
                                }}
                                className="font-semibold text-[#7A005D] hover:underline"
                              >
                                {formatExpirationDisplay(generalLinkExpirationIso)}
                              </button>
                              <HoverTooltip
                                placement="top"
                                align="center"
                                className="whitespace-nowrap rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-gray-900 shadow-lg"
                                content="Remove"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGeneralLinkExpirationIso(null);
                                    setCalendarGeneralLinkOpen(false);
                                  }}
                                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-[#DC2626]"
                                  aria-label="Remove expiration"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </HoverTooltip>
                              {calendarGeneralLinkOpen && generalLinkExpirationIso && (
                                <PortalMenu
                                  open
                                  triggerRef={generalLinkExpirationTriggerRef}
                                  menuRef={generalExpirationCalendarPopoverRef}
                                  placement="bottom"
                                  align="start"
                                  width={288}
                                  offset={8}
                                  onRequestClose={() => setCalendarGeneralLinkOpen(false)}
                                >
                                  <ExpirationCalendarPopover
                                    valueIso={generalLinkExpirationIso}
                                    onSelect={(iso) => {
                                      setGeneralLinkExpirationIso(iso);
                                      setCalendarGeneralLinkOpen(false);
                                    }}
                                    onClose={() => setCalendarGeneralLinkOpen(false)}
                                  />
                                </PortalMenu>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    <PortalMenu
                      open={generalScopeDropdownOpen}
                      triggerRef={generalScopeTriggerRef}
                      menuRef={generalScopeMenuRef}
                      placement="bottom"
                      align="start"
                      width={240}
                      offset={6}
                      className="max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
                      onRequestClose={() => setGeneralScopeDropdownOpen(false)}
                    >
                      <div onKeyDown={(e) => handleMenuArrowNavigation(e, e.currentTarget)}>
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
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralAccessScope(opt.key);
                              if (opt.key === 'restricted') {
                                setGeneralLinkExpirationIso(null);
                                setGeneralLinkAccessRole('View as viewer');
                              }
                              setGeneralScopeDropdownOpen(false);
                            }}
                            className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#EDEBE7]"
                          >
                            <span className="text-[14px] text-gray-900">{opt.listLabel}</span>
                            <span className="mt-0.5 flex w-5 shrink-0 justify-center">
                              {generalAccessScope === opt.key ? (
                                <Check className="w-5 h-5 text-[#1a73e8]" strokeWidth={2.5} />
                              ) : (
                                <span className="block h-5 w-5" />
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PortalMenu>
                  </div>

                  {(generalAccessScope === 'company' || generalAccessScope === 'anyone_link') && (
                    <div ref={generalRoleDropdownRef} className="relative shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneralRoleDropdownOpen((o) => {
                            const next = !o;
                            if (next) {
                              requestAnimationFrame(() => {
                                if (generalRoleMenuListRef.current) {
                                  generalRoleMenuListRef.current.scrollTop = 0;
                                }
                              });
                            }
                            return next;
                          });
                          setGeneralScopeDropdownOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            setGeneralRoleDropdownOpen(true);
                            requestAnimationFrame(() => {
                              const menu = generalRoleMenuListRef.current;
                              const firstItem = menu?.querySelector<HTMLElement>('button[data-menu-item="true"]');
                              firstItem?.focus();
                            });
                          }
                        }}
                        className="inline-flex min-h-[40px] max-w-[min(220px,100%)] cursor-pointer items-center gap-0.5 rounded-lg bg-transparent py-2 pl-3 pr-2 text-left text-sm font-medium text-gray-800 transition-colors"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {generalLinkAccessRole === 'View as viewer' ? 'Viewer' : generalLinkAccessRole}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                      </button>

                      <PortalMenu
                        open={generalRoleDropdownOpen}
                        triggerRef={generalRoleDropdownRef}
                        menuRef={generalRoleMenuListRef}
                        placement="bottom"
                        align="end"
                        width={288}
                        offset={8}
                        className="max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 pb-6 shadow-2xl"
                        onRequestClose={() => setGeneralRoleDropdownOpen(false)}
                      >
                        <div onKeyDown={(e) => handleMenuArrowNavigation(e, e.currentTarget)}>
                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralLinkAccessRole('Editor');
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="group w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900">Editor</span>
                              {generalLinkAccessRole === 'Editor' && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A005D]" />
                              )}
                            </div>
                          </button>
                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralLinkAccessRole('Collaborator');
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="group w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900">Collaborator</span>
                              {generalLinkAccessRole === 'Collaborator' && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A005D]" />
                              )}
                            </div>
                          </button>
                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralLinkAccessRole('View as owner');
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                          >
                            <span>View as owner</span>
                            {generalLinkAccessRole === 'View as owner' && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A005D]" />
                            )}
                          </button>
                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralLinkAccessRole('View as viewer');
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                          >
                            <span>View as viewer</span>
                            {generalLinkAccessRole === 'View as viewer' && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A005D]" />
                            )}
                          </button>
                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              setGeneralLinkAccessRole('Explore as owner');
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                          >
                            <span>Explore as owner</span>
                            {generalLinkAccessRole === 'Explore as owner' && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7A005D]" />
                            )}
                          </button>
                          <div className="my-1 border-t border-gray-100" />

                          <button
                            type="button"
                            data-menu-item="true"
                            onClick={() => {
                              if (generalLinkExpirationIso) {
                                setGeneralLinkExpirationIso(null);
                                setCalendarGeneralLinkOpen(false);
                              } else {
                                setGeneralLinkExpirationIso(toIsoDate(addMonths(new Date(), 1)));
                              }
                              setGeneralRoleDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {generalLinkExpirationIso ? 'Remove expiration' : 'Add expiration'}
                              <HoverTooltip
                                placement="bottom"
                                align="start"
                                delay={0}
                                wrapperClassName="inline-flex"
                                className="h-auto w-[340px] whitespace-normal break-words rounded-lg border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700 shadow-xl"
                                content='Once access expires, this group will no longer be able to access the document. If the artifact is currently set to "Company-wide" or "Anyone with the link," it will automatically switch to "Restricted" after expiration.'
                              >
                                <span
                                  className="inline-flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                                </span>
                              </HoverTooltip>
                            </span>
                          </button>
                        </div>
                      </PortalMenu>

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-6 py-6 border-t border-gray-100 flex items-center justify-between">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/40"
            onClick={() => setIsBulkAddOpen(false)}
          >
            <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-add-individuals-title"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full bg-white shadow-2xl md:max-w-5xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bulk Add Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
              <h2 id="bulk-add-individuals-title" className="text-2xl font-semibold text-gray-900">
                Bulk add individuals
              </h2>
              <button 
                onClick={() => setIsBulkAddOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Bulk Add Content */}
            <div className="flex-1 p-8 pb-40 overflow-y-auto overflow-x-visible">
              <div className="w-full">
                <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                  <p className="text-sm text-gray-600 mb-4">
                    Add people to the group by name, employee ID, work email, or personal email, separated by commas or new lines
                  </p>
                  <div className="relative border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-[#7A005D] focus-within:border-transparent transition-all">
                    <textarea 
                      placeholder="Paste details here"
                      value={bulkInputValue}
                      onChange={(e) => setBulkInputValue(e.target.value)}
                      className="w-full min-h-[80px] h-[80px] p-4 bg-transparent outline-none resize-y text-gray-700 placeholder-gray-400"
                    />
                    <div className="absolute right-4 bottom-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadCsvDemoRows}
                        className="px-4 py-1.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50"
                      >
                        Upload CSV
                      </button>
                      <button
                        type="button"
                        onClick={runBulkImportMatch}
                        disabled={bulkInputValue.trim().length === 0}
                        className={`px-4 py-1.5 font-medium rounded-lg text-sm transition-colors ${
                          bulkInputValue.trim().length === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#7A005D] text-white hover:bg-[#60003D]'
                        }`}
                      >
                        Import
                      </button>
                    </div>
                  </div>
                  {bulkImportRows.length > 0 && (
                    <div className="relative z-[70] mt-5 overflow-visible rounded-xl border border-gray-200">
                      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                        <colgroup>
                          <col style={{width: '36%'}} />
                          <col style={{width: '56%'}} />
                          <col style={{width: '8%'}} />
                        </colgroup>
                        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3 align-middle">{bulkImportIdentifierLabel}</th>
                            <th className="px-4 py-3 align-middle">People</th>
                            <th className="px-4 py-3 align-middle text-right" />
                          </tr>
                        </thead>
                        <tbody>
                          {bulkImportRows.map((row) => {
                            const matched = bulkDirectory.find((p) => p.id === row.matchedPersonId) ?? null;
                            const duplicateMatched =
                              row.matchedPersonId &&
                              bulkImportRows.filter((r) => r.matchedPersonId === row.matchedPersonId).length > 1;
                            const filteredPeople = bulkDirectory.filter((p) =>
                              row.query.trim() === ''
                                ? true
                                : `${p.fullName} ${p.email} ${p.employeeId}`
                                    .toLowerCase()
                                    .includes(row.query.trim().toLowerCase())
                            );
                            return (
                              <tr key={row.id} className="border-t border-gray-100 text-sm text-gray-800">
                                <td className="max-w-0 px-4 py-3 align-top">
                                  <input
                                    value={row.original}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setBulkImportRows((prev) =>
                                        prev.map((item) =>
                                          item.id === row.id
                                            ? { ...item, original: value, identifierType: detectBulkIdentifierType(value) }
                                            : item
                                        )
                                      );
                                    }}
                                    className="w-full truncate rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7A005D]/25 focus:border-[#7A005D]"
                                  />
                                </td>
                                <td className="min-w-[200px] max-w-none px-4 py-3 align-top">
                                  <div
                                    className="relative w-full max-w-[min(100%,28rem)]"
                                    data-people-selector="true"
                                    ref={(el) => {
                                      if (el) bulkPeopleWrapRefs.current[row.id] = el;
                                      else delete bulkPeopleWrapRefs.current[row.id];
                                    }}
                                  >
                                    <div className="relative">
                                      <input
                                        value={row.query || matched?.fullName || ''}
                                        placeholder="Send to external user"
                                        onFocus={() =>
                                          setBulkImportRows((prev) =>
                                            prev.map((item) =>
                                              item.id === row.id
                                                ? { ...item, dropdownOpen: true }
                                                : { ...item, dropdownOpen: false }
                                            )
                                          )
                                        }
                                        onChange={(e) => {
                                          const nextValue = e.target.value;
                                          setBulkImportRows((prev) =>
                                            prev.map((item) =>
                                              item.id === row.id
                                                ? { ...item, query: nextValue, dropdownOpen: true, matchedPersonId: null }
                                                : item
                                            )
                                          );
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setBulkImportRows((prev) =>
                                              prev.map((item) =>
                                                item.id === row.id
                                                  ? { ...item, dropdownOpen: true }
                                                  : item
                                              )
                                            );
                                            requestAnimationFrame(() => {
                                              const menu = document.querySelector<HTMLElement>(`[data-bulk-menu="${row.id}"]`);
                                              const first = menu?.querySelector<HTMLElement>('button[data-menu-item="true"]');
                                              first?.focus();
                                            });
                                          }
                                        }}
                                        className="min-h-[40px] w-full truncate rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7A005D]/25 focus:border-[#7A005D]"
                                      />
                                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    </div>
                                    <PortalMenu
                                      open={row.dropdownOpen}
                                      getTriggerElement={() => bulkPeopleWrapRefs.current[row.id] ?? null}
                                      placement="bottom"
                                      align="start"
                                      width="trigger"
                                      offset={8}
                                      data-bulk-menu={row.id}
                                      className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
                                      onRequestClose={() =>
                                        setBulkImportRows((prev) =>
                                          prev.map((item) =>
                                            item.id === row.id
                                              ? {
                                                  ...item,
                                                  dropdownOpen: false,
                                                  query: item.matchedPersonId ? item.query : '',
                                                }
                                              : item
                                          )
                                        )
                                      }
                                    >
                                      <div onKeyDown={(e) => handleMenuArrowNavigation(e, e.currentTarget)}>
                                        {row.query.trim() === '' && (
                                          <button
                                            type="button"
                                            data-menu-item="true"
                                            onClick={() =>
                                              setBulkImportRows((prev) =>
                                                prev.map((item) =>
                                                  item.id === row.id
                                                    ? { ...item, matchedPersonId: null, dropdownOpen: false, query: '' }
                                                    : item
                                                )
                                              )
                                            }
                                            className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                                          >
                                            <span>Send to external user</span>
                                            {!matched && <Check className="h-4 w-4 text-[#7A005D]" />}
                                          </button>
                                        )}
                                        {filteredPeople.map((personOption) => (
                                          <button
                                            key={personOption.id}
                                            type="button"
                                            data-menu-item="true"
                                            onClick={() => selectBulkMatchedPerson(row.id, personOption)}
                                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                                          >
                                            <span className="inline-flex items-center gap-2">
                                              <img src={personOption.avatar} alt="" className="h-6 w-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                              <span>{personOption.fullName}</span>
                                            </span>
                                            {matched?.id === personOption.id && <Check className="h-4 w-4 text-[#7A005D]" />}
                                          </button>
                                        ))}
                                      </div>
                                    </PortalMenu>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap pl-4 pr-4 py-3 align-middle text-right">
                                  <div className="inline-flex w-full items-center justify-end gap-2">
                                  {duplicateMatched && (
                                    <div data-bulk-warning="true">
                                      <HoverTooltip
                                        placement="top"
                                        align="end"
                                        wrapperClassName="inline-flex items-center"
                                        className="h-auto w-64 whitespace-normal break-words rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs leading-relaxed text-gray-700 shadow-lg"
                                        content="This person has been matched with a different address in the table."
                                      >
                                        <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden />
                                      </HoverTooltip>
                                    </div>
                                  )}
                                  {!duplicateMatched && <span className="h-4 w-4" aria-hidden />}
                                  <button
                                    type="button"
                                    onClick={() => setBulkImportRows((prev) => prev.filter((item) => item.id !== row.id))}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                    aria-label="Remove row"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t border-gray-100">
                            <td colSpan={3} className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setBulkImportRows((prev) => [
                                    ...prev,
                                    {
                                      id: newBulkImportRowId(),
                                      original: '',
                                      identifierType: 'email',
                                      matchedPersonId: null,
                                      query: '',
                                      dropdownOpen: false,
                                    },
                                  ])
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <CirclePlus className="h-4 w-4" />
                                Add row
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-8 py-4 flex justify-end">
              <button
                type="button"
                disabled={!canCommitBulkAdd}
                onClick={() => {
                  if (!canCommitBulkAdd) return;
                  const namesToAdd = bulkImportRows
                    .map((row) => {
                      const matched = bulkDirectory.find((p) => p.id === row.matchedPersonId);
                      if (matched) return matched.fullName;
                      const typed = row.original.trim() || row.query.trim();
                      return typed || null;
                    })
                    .filter((v): v is string => Boolean(v));
                  if (namesToAdd.length > 0) {
                    setSelectedChips((prev) => Array.from(new Set([...prev, ...namesToAdd])));
                    showToast(`${namesToAdd.length} people/groups selected`);
                  }
                  setBulkImportRows([]);
                  setBulkInputValue('');
                  setIsBulkAddOpen(false);
                }}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${
                  canCommitBulkAdd
                    ? 'bg-[#7A005D] text-white hover:bg-[#60003D]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Ownership Modal */}
      <AnimatePresence>
        {pendingTransferPersonId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto"
            >
              <div className="px-8 pt-8 pb-3">
                <h2 className="text-2xl font-bold text-gray-900">Transfer ownership?</h2>
              </div>
              <div className="px-8 pb-8">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-relaxed text-amber-900">
                  After the ownership has been transferred, the previous owner will no longer be able to transfer it again. Are you sure?
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setPendingTransferPersonId(null);
                    }}
                    className="px-6 py-2.5 border border-gray-300 text-gray-900 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (pendingTransferPersonId) transferOwnershipTo(pendingTransferPersonId);
                    }}
                    className="px-6 py-2.5 bg-[#7A005D] text-white font-semibold rounded-xl hover:bg-[#60003D] transition-colors"
                  >
                    Transfer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview drawer */}
      <AnimatePresence>
        {previewDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/40"
            onClick={() => setPreviewDrawer(null)}
          >
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 210 }}
              className="fixed right-0 top-0 h-full w-full bg-white shadow-2xl md:max-w-5xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-semibold text-gray-900">
                  {previewDrawer.mode === 'row' ? 'Preview included people' : 'Preview all people with access'}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewDrawer(null)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto px-8 py-6">
                <div className="mb-4 text-sm text-gray-600">
                  Demo roster preview for granted access in this prototype.
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="min-w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="text-sm font-semibold text-gray-600">
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Access type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={`${row.username}-${row.role}`} className="border-t border-gray-100 text-sm text-gray-800">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={row.avatar}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span>{row.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{row.role}</td>
                          <td className="px-4 py-3">{row.accessType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

