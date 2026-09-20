import React, { useState, useEffect } from 'react';
import {
  Users2,
  UserCheck,
  ShieldAlert,
  Award,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Plus,
  Copy,
  RefreshCw,
  Search,
  Check,
  X,
  UserX,
  Clock,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Eye,
  Lock,
  Sliders,
  DollarSign,
  Activity,
  FileText,
  Shield
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import {
  fetchStudentMentorsApi,
  fetchMentorStudentsFullApi,
  fetchStudentDetailsForMentorApi,
  searchMentorAccountsApi,
  searchStudentByCodeApi,
  connectMentorByCodeApi,
  updateStudentSharingPermissionsApi,
  disconnectMentorRelationshipApi,
} from '../../services/apiClient';

interface ConnectedMentor {
  relationshipId: string;
  mentorUserId: string;
  displayName: string;
  accountCode: string;
  avatarUrl: string;
  status: string;
  connectedDate: string;
  permissions: {
    sharedAccountIds: string[];
    canViewAccountOverview: boolean;
    canViewTrades: boolean;
    canViewAnalytics: boolean;
    canViewEquityCurve: boolean;
    canViewDrawdown: boolean;
    canViewPlaybooks: boolean;
    canViewNotes: boolean;
    canViewRiskControls: boolean;
  };
}

interface ConnectedStudent {
  id: string;
  relationshipId: string;
  code: string;
  name: string;
  avatar: string;
  accountName: string;
  currentBalance: number;
  netPnl: number;
  winRate: number;
  totalTrades: number;
  status: string;
  joinedDate: string;
  riskBreached: boolean;
}

interface SearchResult {
  id: string;
  displayName: string;
  accountCode: string;
  avatarUrl: string;
  role: string;
}

export const MentorModeView: React.FC = () => {
  const {
    userProfile,
    formatCurrency,
    addToast,
    theme,
    mentorDirectivesSent,
    mentorDirectivesReceived,
    dispatchMentorDirective,
    acknowledgeMentorDirective,
    accounts,
  } = useTrading();

  const isLight = theme === 'light';

  // Active primary tab: 'mentor' (Mentor Workspace) vs 'student' (Student Mode)
  const [activeTab, setActiveTab] = useState<'mentor' | 'student'>('mentor');

  // Real data state
  const [mentorsList, setMentorsList] = useState<ConnectedMentor[]>([]);
  const [studentsList, setStudentsList] = useState<ConnectedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected student in Mentor Workspace
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [selectedSharedAccountId, setSelectedSharedAccountId] = useState<string>('ALL');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Search & Directives state
  const [searchQuery, setSearchQuery] = useState('');
  const [directiveNote, setDirectiveNote] = useState('');
  const [isSubmittingDirective, setIsSubmittingDirective] = useState(false);

  // Add Mentor Modal state
  const [isAddMentorModalOpen, setIsAddMentorModalOpen] = useState(false);
  const [inputMentorCode, setInputMentorCode] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Add Student Modal state (For Mentor Workspace)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [inputStudentCode, setInputStudentCode] = useState('');
  const [foundStudent, setFoundStudent] = useState<SearchResult | null>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState('');
  const [isConnectingStudent, setIsConnectingStudent] = useState(false);

  // Permissions Modal state
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState<ConnectedMentor | null>(null);
  const [permsForm, setPermsForm] = useState<ConnectedMentor['permissions']>({
    sharedAccountIds: [],
    canViewAccountOverview: true,
    canViewTrades: true,
    canViewAnalytics: true,
    canViewEquityCurve: true,
    canViewDrawdown: true,
    canViewPlaybooks: false,
    canViewNotes: false,
    canViewRiskControls: false,
  });
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Custom Disconnect Confirmation state
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch initial mentors & students data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mentors, students] = await Promise.all([
        fetchStudentMentorsApi(),
        fetchMentorStudentsFullApi(),
      ]);

      if (Array.isArray(mentors)) setMentorsList(mentors);
      if (Array.isArray(students)) {
        setStudentsList(students);
        if (students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(students[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching mentor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch detailed student view when a student is selected
  useEffect(() => {
    if (!selectedStudentId || activeTab !== 'mentor') return;

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const details = await fetchStudentDetailsForMentorApi(selectedStudentId);
        setStudentDetails(details);
      } catch (err: any) {
        console.error('Error fetching student details:', err);
        addToast('Access Error', err.message || 'Failed to load student details', 'error');
        setStudentDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedStudentId, activeTab]);

  // Handle Search in Add Mentor Modal
  const handleSearchMentor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMentorCode.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const results = await searchMentorAccountsApi(inputMentorCode.trim());
      if (results.length === 0) {
        setSearchError('No TradeForge account found with that name or Unique Mentor Code.');
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Network error while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  // Connect Mentor by Code or Profile ID
  const handleConnectMentor = async (codeOrId: string) => {
    setIsConnecting(true);
    try {
      const data = await connectMentorByCodeApi(codeOrId);
      addToast('Connected Successfully!', `Mentor ${data.mentor.displayName} connected to your account.`, 'success');
      setIsAddMentorModalOpen(false);
      setInputMentorCode('');
      setSearchResults([]);
      fetchData();
    } catch (err: any) {
      addToast('Connection Failed', err.message || 'Failed to connect mentor', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Search Student by Unique Mentor Code
  const handleSearchStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = inputStudentCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsSearchingStudent(true);
    setStudentSearchError('');
    setFoundStudent(null);

    try {
      const result = await searchStudentByCodeApi(cleanCode);
      setFoundStudent(result);
    } catch (err: any) {
      setStudentSearchError(err.message || 'Student not found. Check the Unique Mentor Code.');
    } finally {
      setIsSearchingStudent(false);
    }
  };

  // Connect Student
  const handleConnectStudent = async () => {
    if (!foundStudent) return;
    setIsConnectingStudent(true);
    try {
      await connectMentorByCodeApi(foundStudent.accountCode, 'student');
      addToast('Student Connected!', `Student ${foundStudent.displayName} connected to your Mentor Workspace.`, 'success');
      setIsAddStudentModalOpen(false);
      setInputStudentCode('');
      setFoundStudent(null);
      setStudentSearchError('');

      await fetchData();
      setSelectedStudentId(foundStudent.id);
    } catch (err: any) {
      setStudentSearchError(err.message || 'Failed to connect student.');
      addToast('Connection Failed', err.message || 'Failed to connect student', 'error');
    } finally {
      setIsConnectingStudent(false);
    }
  };

  // Open Permissions Modal for a Mentor
  const handleOpenPermsModal = (mentor: ConnectedMentor) => {
    setEditingMentor(mentor);
    setPermsForm(mentor.permissions);
    setIsPermsModalOpen(true);
  };

  // Save Permissions
  const handleSavePerms = async () => {
    if (!editingMentor) return;
    setIsSavingPerms(true);
    try {
      await updateStudentSharingPermissionsApi(editingMentor.mentorUserId, permsForm);
      addToast('Permissions Saved', `Sharing permissions updated for ${editingMentor.displayName}.`, 'success');
      setIsPermsModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Failed to update permissions', 'error');
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Disconnect Mentor or Student - Triggers modal
  const handleDisconnect = (targetUserId: string, targetName: string) => {
    setDisconnectTarget({ id: targetUserId, name: targetName });
    setIsDisconnectConfirmOpen(true);
  };

  // Perform actual API call once user confirms in custom modal
  const executeDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      await disconnectMentorRelationshipApi(disconnectTarget.id);
      addToast('Disconnected', `${disconnectTarget.name} has been removed from your connections.`, 'info');
      if (selectedStudentId === disconnectTarget.id) {
        setSelectedStudentId(null);
        setStudentDetails(null);
      }
      setIsDisconnectConfirmOpen(false);
      setDisconnectTarget(null);
      fetchData();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to disconnect', 'error');
    }
  };

  // Dispatch Directive to Student
  const handleSendDirective = async () => {
    if (!directiveNote.trim() || !studentDetails || isSubmittingDirective) return;
    setIsSubmittingDirective(true);
    try {
      await dispatchMentorDirective(studentDetails.studentProfile.accountCode, directiveNote.trim(), 'DIRECTIVE');
      setDirectiveNote('');
    } catch {
      // Toast handled in context
    } finally {
      setIsSubmittingDirective(false);
    }
  };

  const filteredStudents = studentsList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C232E]'}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-blue-500" />
            Mentor Hub & Account Sharing
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              REAL-TIME SYNC
            </span>
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
            Securely share live performance data with coaches or review student accounts with privacy controls.
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('mentor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'mentor'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
                ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                : 'bg-[#12161D] text-slate-400 hover:bg-[#1A1F27] hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Mentor Workspace (Students: {studentsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('student')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'student'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-400/40 shadow-md shadow-indigo-600/20'
              : isLight
                ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                : 'bg-[#12161D] text-slate-400 hover:bg-[#1A1F27] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Student Mode (My Mentors & Code)</span>
          {mentorsList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
              {mentorsList.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================== */}
      {/* MODE 1: MENTOR WORKSPACE                  */}
      {/* ========================================== */}
      {activeTab === 'mentor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 Columns: Student Roster */}
            <div className={`lg:col-span-4 rounded-2xl border p-4 space-y-3 ${
              isLight ? 'bg-white border-zinc-200 shadow-xs' : 'bg-[#12161D] border-[#1C232E]'
            }`}>
              <div className="flex items-center justify-between px-1 pb-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Connected Students ({filteredStudents.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setInputStudentCode('');
                      setFoundStudent(null);
                      setStudentSearchError('');
                      setIsAddStudentModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-[0.98]"
                    title="Add Student by Code"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </button>
                  <button
                    onClick={fetchData}
                    className="p-1 text-slate-400 hover:text-blue-400 transition"
                    title="Refresh Roster"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className={`absolute left-3 top-2.5 w-3.5 h-3.5 ${isLight ? 'text-zinc-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  placeholder="Search by name or Mentor Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-blue-500 ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      : 'bg-[#0A0D14] border-[#1C232E] text-slate-200'
                  }`}
                />
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                  <Users2 className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                  <p className="font-semibold text-slate-300">No students connected yet.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Enter a student's Unique Mentor Code to connect them directly to your Mentor Workspace.
                  </p>
                  <button
                    onClick={() => {
                      setInputStudentCode('');
                      setFoundStudent(null);
                      setStudentSearchError('');
                      setIsAddStudentModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect Student</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudentId === student.id;
                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? isLight
                              ? 'bg-blue-50 border-blue-300 shadow-xs'
                              : 'bg-blue-600/15 border-blue-500/40 shadow-sm'
                            : isLight
                              ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                              : 'bg-[#0A0D14] border-[#1C232E] hover:border-[#273141]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#273141]"
                          />
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                              {student.name}
                            </div>
                            <div className="text-[10px] font-mono text-blue-400 font-semibold truncate">
                              {student.code}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-xs font-mono font-bold ${student.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(student.netPnl)}
                          </div>
                          <div className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {student.winRate}% WR
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 8 Columns: Detailed Student Dashboard */}
            <div className="lg:col-span-8 space-y-4">
              {isLoadingDetails ? (
                <div className={`p-12 text-center rounded-2xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Loading student performance data...</p>
                </div>
              ) : studentDetails ? (
                <>
                  {/* Student Header Card */}
                  <div className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${
                    isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
                  }`}>
                    <div className="flex items-center gap-4">
                      <img
                        src={studentDetails.studentProfile.avatarUrl}
                        alt={studentDetails.studentProfile.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/40"
                      />
                      <div>
                        <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                          {studentDetails.studentProfile.displayName}
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            {studentDetails.studentProfile.accountCode}
                          </span>
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected & Verified Student</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDisconnect(studentDetails.studentProfile.id, studentDetails.studentProfile.displayName)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>

                  {/* Read-Only Notice */}
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl text-xs">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Read-Only Mentor View:</strong> Data displayed is controlled by student's privacy toggles.
                    </span>
                  </div>

                  {/* Shared Account Selector */}
                  {studentDetails.sharedAccounts && studentDetails.sharedAccounts.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-semibold">Shared Account:</span>
                      <select
                        value={selectedSharedAccountId}
                        onChange={(e) => setSelectedSharedAccountId(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                          isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#12161D] border-[#1C232E] text-slate-200'
                        }`}
                      >
                        <option value="ALL">All Shared Accounts ({studentDetails.sharedAccounts.length})</option>
                        {studentDetails.sharedAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Account Overview Stats (If Permitted) */}
                  {studentDetails.overview ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Equity</span>
                        <div className={`text-lg font-black font-mono mt-0.5 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                          {formatCurrency(studentDetails.overview.currentEquity)}
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Net P&L</span>
                        <div className={`text-lg font-black font-mono mt-0.5 ${studentDetails.overview.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(studentDetails.overview.netPnl)}
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Return %</span>
                        <div className={`text-lg font-black font-mono mt-0.5 ${Number(studentDetails.overview.overallPnlPercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {studentDetails.overview.overallPnlPercent}%
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Starting Balance</span>
                        <div className="text-lg font-black font-mono text-slate-400 mt-0.5">
                          {formatCurrency(studentDetails.overview.initialBalance)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border text-center text-xs text-slate-500 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                      <Lock className="w-4 h-4 inline mr-1.5 opacity-60" />
                      Account Overview hidden by student privacy settings.
                    </div>
                  )}

                  {/* Performance Metrics Grid (If Permitted) */}
                  {studentDetails.performance ? (
                    <div className={`p-5 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
                    }`}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-400" />
                        Trading Analytics & Performance
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Win Rate</span>
                          <strong className="text-sm text-emerald-400">{studentDetails.performance.winRate}%</strong>
                        </div>
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Total Executions</span>
                          <strong className="text-sm">{studentDetails.performance.totalTrades}</strong>
                        </div>
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Profit Factor</span>
                          <strong className="text-sm text-blue-400">{studentDetails.performance.profitFactor}</strong>
                        </div>
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Average Win</span>
                          <strong className="text-sm text-emerald-400">{formatCurrency(studentDetails.performance.avgWin)}</strong>
                        </div>
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Average Loss</span>
                          <strong className="text-sm text-rose-400">{formatCurrency(studentDetails.performance.avgLoss)}</strong>
                        </div>
                        <div className={`p-3 rounded-xl border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                          <span className="text-[10px] text-slate-500 block">Avg R-Multiple</span>
                          <strong className="text-sm text-amber-400">{studentDetails.performance.avgR}R</strong>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Trade History Table (If Permitted) */}
                  {studentDetails.permissions.canViewTrades ? (
                    <div className={`p-5 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
                    }`}>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-400" />
                        Executed Trade History ({studentDetails.trades.length})
                      </h3>
                      {studentDetails.trades.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No executed trades logged in shared accounts.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className={`border-b ${isLight ? 'border-zinc-200 text-zinc-500' : 'border-[#1C232E] text-slate-400'}`}>
                                <th className="pb-2 font-bold">Symbol</th>
                                <th className="pb-2 font-bold">Type</th>
                                <th className="pb-2 font-bold">Size</th>
                                <th className="pb-2 font-bold">Entry</th>
                                <th className="pb-2 font-bold">Exit</th>
                                <th className="pb-2 font-bold">P&L</th>
                                <th className="pb-2 font-bold">R</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono">
                              {studentDetails.trades.slice(0, 15).map((t: any) => (
                                <tr key={t.id} className="hover:bg-blue-500/5">
                                  <td className="py-2.5 font-bold">{t.symbol}</td>
                                  <td className="py-2.5">
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                                      t.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                      {t.direction}
                                    </span>
                                  </td>
                                  <td className="py-2.5">{t.quantity}</td>
                                  <td className="py-2.5">{t.entryPrice}</td>
                                  <td className="py-2.5">{t.exitPrice || '-'}</td>
                                  <td className={`py-2.5 font-bold ${(t.netPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(t.netPnl || 0)}
                                  </td>
                                  <td className="py-2.5 text-slate-400">{t.rMultiple ? `${t.rMultiple}R` : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border text-center text-xs text-slate-500 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'}`}>
                      <Lock className="w-4 h-4 inline mr-1.5 opacity-60" />
                      Trade History hidden by student privacy settings.
                    </div>
                  )}

                  {/* Coach Directive Dispatcher */}
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
                  }`}>
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      Send Coach Directive to {studentDetails.studentProfile.displayName}
                    </h3>
                    <textarea
                      rows={3}
                      placeholder={`Write trading critique, rule assignments, or max drawdown caps for ${studentDetails.studentProfile.displayName}...`}
                      value={directiveNote}
                      onChange={(e) => setDirectiveNote(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs font-mono focus:outline-none focus:border-blue-500 ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                          : 'bg-[#0A0D14] border-[#1C232E] text-slate-100'
                      }`}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSendDirective}
                        disabled={isSubmittingDirective || !directiveNote.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                      >
                        {isSubmittingDirective ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Dispatching...</span>
                          </>
                        ) : (
                          <span>Dispatch Directive</span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`p-12 text-center rounded-2xl border ${isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'}`}>
                  <Users2 className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold">No student selected</p>
                  <p className="text-xs text-slate-500 mt-1">Select a connected student from the left panel to review their performance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODE 2: STUDENT MODE                      */}
      {/* ========================================== */}
      {activeTab === 'student' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Section 1: UNIQUE MENTOR CODE */}
          <div className={`p-6 rounded-2xl border bg-gradient-to-br space-y-4 ${
            isLight
              ? 'from-blue-50 to-white border-blue-200'
              : 'from-blue-950/60 to-slate-900 border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h2 className={`text-base font-bold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                  MY UNIQUE MENTOR CODE
                </h2>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                STABLE & ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className={`flex-1 border rounded-xl px-4 py-3 font-mono text-lg font-black tracking-widest text-blue-500 flex items-center justify-between ${
                isLight ? 'bg-white border-zinc-300' : 'bg-[#0A0D14] border-[#1C232E]'
              }`}>
                <span>{userProfile.accountCode || 'TF-MTR-7K4P9Q'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userProfile.accountCode);
                    addToast('Mentor Code copied', 'Unique Mentor Code copied to clipboard', 'success');
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-500 transition flex items-center gap-1.5 text-xs font-sans font-semibold"
                  title="Copy Code"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>

            <p className={`text-xs leading-relaxed italic ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
              Share this code with trusted mentors or students to connect your TradeForge accounts.
            </p>
          </div>

          {/* Section 2: MY MENTORS */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                <h3 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                  MY MENTORS ({mentorsList.length})
                </h3>
              </div>

              <button
                onClick={() => {
                  setInputMentorCode('');
                  setSearchResults([]);
                  setSearchError('');
                  setIsAddMentorModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mentor</span>
              </button>
            </div>

            {mentorsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Users2 className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                <p className="font-semibold text-slate-400">No mentors connected yet.</p>
                <p className="text-[11px] text-slate-500">
                  Click 'Add Mentor' to search for a coach using their Unique Mentor Code or Display Name.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mentorsList.map((m) => (
                  <div
                    key={m.relationshipId}
                    className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatarUrl}
                        alt={m.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#273141]"
                      />
                      <div>
                        <div className={`text-xs font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                          <span>{m.displayName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {m.accountCode}
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-slate-400'}`}>
                          Connected: {m.connectedDate} • Status: <strong className="text-emerald-400">Active</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenPermsModal(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-[#273141] transition"
                      >
                        <Sliders className="w-3.5 h-3.5 text-blue-400" />
                        <span>Sharing Permissions</span>
                      </button>

                      <button
                        onClick={() => handleDisconnect(m.mentorUserId, m.displayName)}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                        title="Disconnect Mentor"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Received Directives Section */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <h3 className={`text-xs font-bold pb-2 border-b ${isLight ? 'border-zinc-200' : 'border-[#1C232E]'} flex items-center gap-2 text-blue-400 uppercase tracking-wider`}>
              <MessageSquare className="w-4 h-4" />
              <span>Received Coach Directives ({mentorDirectivesReceived.length})</span>
            </h3>

            {mentorDirectivesReceived.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">No directives or feedback received from your mentors yet.</p>
            ) : (
              <div className="space-y-3">
                {mentorDirectivesReceived.map((directive: any) => (
                  <div
                    key={directive.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <p className={`text-xs ${isLight ? 'text-zinc-800' : 'text-slate-100'} font-mono`}>
                        {directive.content}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Issued: {new Date(directive.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {directive.status === 'PENDING' ? (
                        <button
                          onClick={() => acknowledgeMentorDirective(directive.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledged</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD MENTOR MODAL                  */}
      {/* ========================================== */}
      {isAddMentorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                <Plus className="w-4 h-4 text-blue-500" />
                Add Mentor / Connect Coach
              </h3>
              <button
                onClick={() => setIsAddMentorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchMentor} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                  Search by Display Name or Unique Mentor Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. TF-MTR-7K4P9Q"
                    value={inputMentorCode}
                    onChange={(e) => setInputMentorCode(e.target.value)}
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold tracking-wider focus:outline-none focus:border-blue-500 ${
                      isLight
                        ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                        : 'bg-[#0A0D14] border-[#1C232E] text-blue-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !inputMentorCode.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20"
                  >
                    {isSearching ? 'Searching...' : 'Find Mentor'}
                  </button>
                </div>
              </div>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {searchError}
              </div>
            )}

            {/* Search Results list */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#1C232E]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Search Results ({searchResults.length})
                </span>
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={res.avatarUrl}
                        alt={res.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#273141]"
                      />
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                          {res.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-blue-400">
                          {res.accountCode}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConnectMentor(res.accountCode)}
                      disabled={isConnecting}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CONNECT A STUDENT                   */}
      {/* ========================================== */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                <Plus className="w-4 h-4 text-blue-500" />
                Connect a Student
              </h3>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchStudent} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-zinc-700' : 'text-slate-300'}`}>
                  Student Unique Mentor Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="TF-MTR-7K4P9Q"
                    value={inputStudentCode}
                    onChange={(e) => {
                      setInputStudentCode(e.target.value);
                      setStudentSearchError('');
                      setFoundStudent(null);
                    }}
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-blue-500 ${
                      isLight
                        ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                        : 'bg-[#0A0D14] border-[#1C232E] text-blue-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isSearchingStudent || !inputStudentCode.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 shrink-0"
                  >
                    {isSearchingStudent ? 'Finding...' : 'Find Student'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ask your student for their 10-character code (e.g. TF-MTR-7K4P9Q) from Student Mode.
                </p>
              </div>
            </form>

            {studentSearchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {studentSearchError}
              </div>
            )}

            {/* Student Preview Card */}
            {foundStudent && (
              <div className="space-y-3 pt-3 border-t border-[#1C232E]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Student Preview
                </span>
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
                }`}>
                  <div className="flex items-center gap-3">
                    <img
                      src={foundStudent.avatarUrl}
                      alt={foundStudent.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-[#273141]"
                    />
                    <div>
                      <div className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                        {foundStudent.displayName}
                      </div>
                      <div className="text-[10px] font-mono text-blue-400 font-semibold">
                        {foundStudent.accountCode}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Role: {foundStudent.role}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectStudent}
                    disabled={isConnectingStudent}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 shrink-0"
                  >
                    {isConnectingStudent ? 'Connecting...' : 'Connect Student'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: SHARING PERMISSIONS MODAL        */}
      {/* ========================================== */}
      {isPermsModalOpen && editingMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1C232E]">
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                  <Sliders className="w-4 h-4 text-blue-500" />
                  Sharing Permissions for {editingMentor.displayName}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Control granular data visibility for this specific mentor.
                </p>
              </div>
              <button
                onClick={() => setIsPermsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Account Selector */}
              {accounts.length > 0 && (
                <div className="p-3 rounded-xl border border-[#1C232E] bg-[#0A0D14] space-y-1.5">
                  <span className="font-bold text-slate-300 block">Shared Trading Accounts:</span>
                  <div className="space-y-1">
                    {accounts.map((acc) => {
                      const isChecked = permsForm.sharedAccountIds.length === 0 || permsForm.sharedAccountIds.includes(acc.id);
                      return (
                        <label key={acc.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPermsForm((prev) => ({
                                  ...prev,
                                  sharedAccountIds: [...prev.sharedAccountIds, acc.id],
                                }));
                              } else {
                                setPermsForm((prev) => ({
                                  ...prev,
                                  sharedAccountIds: prev.sharedAccountIds.filter((id) => id !== acc.id),
                                }));
                              }
                            }}
                            className="rounded border-[#273141] bg-[#12161D] text-blue-500"
                          />
                          <span>{acc.name} ({formatCurrency(acc.currentBalance ?? (acc as any).balance ?? 0)})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { key: 'canViewAccountOverview', label: 'Trading Account Overview', desc: 'Shows balances, current equity, and net return %.' },
                  { key: 'canViewTrades', label: 'Trade History', desc: 'Allows mentor to inspect entry/exit prices, symbols, and sizes.' },
                  { key: 'canViewAnalytics', label: 'Performance Analytics', desc: 'Provides win rate, profit factor, average R, and session stats.' },
                  { key: 'canViewEquityCurve', label: 'Equity Curve Chart', desc: 'Shows visual equity curve chart over time.' },
                  { key: 'canViewDrawdown', label: 'Drawdown Chart', desc: 'Shows peak-to-trough drawdown chart.' },
                  { key: 'canViewPlaybooks', label: 'Strategy Playbooks', desc: 'Gives read access to custom strategy playbooks & rules.' },
                  { key: 'canViewNotes', label: 'Trade Notes & Journal', desc: 'Allows mentor to read your private trade reflections.' },
                  { key: 'canViewRiskControls', label: 'Risk Controls & Circuit Breaker', desc: 'Shows max daily loss limits and circuit breaker status.' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0A0D14] border-[#1C232E]'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${isLight ? 'text-zinc-900' : 'text-slate-200'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean((permsForm as any)[item.key])}
                        onChange={(e) => {
                          setPermsForm((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1C232E]">
              <button
                type="button"
                onClick={() => setIsPermsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePerms}
                disabled={isSavingPerms}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isSavingPerms ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: DISCONNECT CONFIRMATION MODAL    */}
      {/* ========================================== */}
      {isDisconnectConfirmOpen && disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-zinc-200' : 'bg-[#12161D] border-[#1C232E]'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-slate-100'}`}>
                Confirm Disconnection
              </h3>
            </div>
            
            <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-slate-400'}`}>
              Are you sure you want to disconnect <strong>{disconnectTarget.name}</strong>? 
              This will immediately revoke all access rights, shared journals, and performance syncs.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDisconnectConfirmOpen(false);
                  setDisconnectTarget(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isLight 
                    ? 'text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200' 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDisconnect}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-600/20 transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorModeView;
