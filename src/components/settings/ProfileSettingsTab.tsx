import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Globe,
  Camera,
  Save,
  Lock,
  BadgeCheck,
  Upload,
  Trash2,
  Loader2,
  ChevronDown,
  Search,
  Check,
  Clock,
  Coins,
  Shield,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { COUNTRIES, TIMEZONES, CURRENCIES } from './countries';
import { uploadAvatarApi } from '../../services/apiClient';

export const ProfileSettingsTab: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    authUser,
    addToast,
    addActivityLog,
    theme,
  } = useTrading();

  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Authenticated real email (never hardcoded, never duskflow artifact)
  const authenticatedEmail = (authUser?.email && !authUser.email.includes('duskflow.io'))
    ? authUser.email
    : (userProfile?.email && !userProfile.email.includes('duskflow.io') ? userProfile.email : (authUser?.email || ''));

  // Local form state
  const [name, setName] = useState(userProfile?.name || 'Trader');
  const [professionalTitle, setProfessionalTitle] = useState(
    userProfile?.professionalTitle || 'Senior Quantitative Futures Trader'
  );
  const [accountCode, setAccountCode] = useState(
    userProfile?.accountCode || 'TF-QUANT-892'
  );
  const [experienceLevel, setExperienceLevel] = useState(
    userProfile?.experienceLevel || '5+ Years (Full-Time Funded)'
  );
  const [country, setCountry] = useState(userProfile?.country || 'United States');
  const [timezone, setTimezone] = useState(userProfile?.timezone || 'America/New_York');
  const [preferredCurrency, setPreferredCurrency] = useState(
    userProfile?.preferredCurrency || 'USD'
  );
  const [bio, setBio] = useState(
    userProfile?.bio ||
      'Systematic order-flow trader specializing in CME E-mini index futures (ES, NQ) using volume profile, delta absorption, and opening range breakouts.'
  );
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [accountCodeError, setAccountCodeError] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sync state whenever userProfile or authUser changes/loads
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name) setName(userProfile.name);
      if (userProfile.professionalTitle) setProfessionalTitle(userProfile.professionalTitle);
      if (userProfile.accountCode) setAccountCode(userProfile.accountCode);
      if (userProfile.experienceLevel) setExperienceLevel(userProfile.experienceLevel);
      if (userProfile.country) setCountry(userProfile.country);
      if (userProfile.timezone) setTimezone(userProfile.timezone);
      if (userProfile.preferredCurrency) setPreferredCurrency(userProfile.preferredCurrency);
      if (userProfile.bio !== undefined) setBio(userProfile.bio);
      if (userProfile.avatarUrl !== undefined) setAvatarUrl(userProfile.avatarUrl);
    }
  }, [userProfile]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries by search query
  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountryObj = COUNTRIES.find(c => c.name === country) || {
    name: country,
    code: 'US',
    flag: '🇺🇸',
  };

  // Avatar Initials Fallback
  const userInitials = (name || 'Trader')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TR';

  // Handle avatar file selection & upload
  const processAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Invalid File', 'Please upload a valid image file (PNG, JPG, WebP, GIF)', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('File Too Large', 'Please select an image smaller than 5 MB', 'warning');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // 1. Immediate client preview using FileReader
      const reader = new FileReader();
      const previewPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUrl = await previewPromise;

      // Set immediate visual preview
      setAvatarUrl(dataUrl);

      // 2. Upload to Supabase Storage / Server storage proxy
      const uploadedUrl = await uploadAvatarApi(dataUrl, file.type);
      const finalUrl = uploadedUrl || dataUrl;

      setAvatarUrl(finalUrl);

      // 3. Save persistently to user profile
      await updateUserProfile({ avatarUrl: finalUrl });

      await addActivityLog({
        action: 'UPDATE_AVATAR',
        category: 'SECURITY',
        object: 'Trader Avatar Photo',
        status: 'INFO',
        details: { fileName: file.name, fileSize: file.size },
      });

      addToast('Avatar Updated', 'Profile photo uploaded and saved across the platform', 'success');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      addToast('Upload Error', err?.message || 'Could not upload avatar photo', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
    // Reset file input so user can re-select the same file if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      setAvatarUrl('');
      await updateUserProfile({ avatarUrl: '' });
      addToast('Avatar Removed', 'Profile photo reset to standard initials badge', 'info');
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to remove avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
  };

  // Handle Trader Handle Validation
  const handleAccountCodeChange = (val: string) => {
    const sanitized = val.toUpperCase().replace(/\s+/g, '-');
    setAccountCode(sanitized);
    if (sanitized && !/^[A-Z0-9_-]{3,32}$/.test(sanitized)) {
      setAccountCodeError('Must be 3–32 characters (letters, numbers, underscores, hyphens)');
    } else {
      setAccountCodeError('');
    }
  };

  // Form submit handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountCode && !/^[A-Z0-9_-]{3,32}$/.test(accountCode)) {
      addToast('Invalid Handle', 'Please fix the trader account code format', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        name,
        professionalTitle,
        accountCode: accountCode.trim(),
        experienceLevel,
        country,
        timezone,
        preferredCurrency,
        bio,
        avatarUrl,
      });

      await addActivityLog({
        action: 'UPDATE_PROFILE',
        category: 'SECURITY',
        object: 'Trader Identity & Bio Profile',
        status: 'INFO',
        details: {
          name,
          title: professionalTitle,
          accountCode,
          country,
          timezone,
          preferredCurrency,
        },
      });
    } catch (err: any) {
      console.error('Save profile failed:', err);
      addToast('Update Failed', err.message || 'Could not save profile changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C232E]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Trader Profile & Identity
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your trader desk handle, avatar, credentials, and institutional bio.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving || isUploadingAvatar || !!accountCodeError}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm border border-blue-500/50 transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Group 1: Avatar & Desk Verification */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-5 sm:p-6 rounded-2xl bg-[#12161D] border transition-all flex flex-col sm:flex-row items-center gap-5 ${
          isDraggingOver
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-[#1C232E]'
        }`}
      >
        <div className="relative group shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || 'Trader Avatar'}
              referrerPolicy="no-referrer"
              className="w-18 h-18 rounded-2xl object-cover border border-blue-500/40 shadow-sm"
            />
          ) : (
            <div className="w-18 h-18 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xl font-bold">
              {userInitials}
            </div>
          )}

          {isUploadingAvatar && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 shadow cursor-pointer transition disabled:opacity-50"
            title="Upload Profile Picture"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-sm font-bold text-white truncate max-w-xs">{name || 'Trader'}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BadgeCheck className="w-3 h-3" />
              Verified Trader
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Handle: <span className="text-blue-400 font-mono font-medium">@{accountCode || 'trader'}</span> • <span className="text-slate-300">{professionalTitle}</span>
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C232E] hover:bg-[#252D3B] text-slate-200 border border-[#2B3545] transition cursor-pointer"
            >
              <Upload className="w-3 h-3 text-blue-400" />
              <span>Upload Photo</span>
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}

            <span className="text-xs text-slate-500 sm:ml-2">
              PNG, JPG, WebP up to 5MB
            </span>
          </div>
        </div>
      </div>

      {/* Group 2: Personal & Desk Information */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Personal & Desk Information
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Basic identity displayed across your journal, community lounge, and reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Marcus Vance"
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200">Email Address</label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                Verified
              </span>
            </div>
            <input
              type="email"
              readOnly
              disabled
              value={authenticatedEmail || 'Authenticated Session'}
              className="w-full bg-[#080B10] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-slate-400 text-xs font-mono cursor-not-allowed opacity-80"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">Professional Title</label>
            <input
              type="text"
              value={professionalTitle}
              onChange={e => setProfessionalTitle(e.target.value)}
              placeholder="e.g. Senior Quantitative Futures Trader"
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">Trader Handle / Code</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-xs">@</span>
              <input
                type="text"
                value={accountCode}
                onChange={e => handleAccountCodeChange(e.target.value)}
                placeholder="TF-QUANT-892"
                className={`w-full bg-[#0A0D14] border rounded-xl pl-8 pr-3.5 py-2.5 text-white text-xs font-mono focus:outline-none transition ${
                  accountCodeError ? 'border-rose-500' : 'border-[#1C232E] focus:border-blue-500'
                }`}
              />
            </div>
            {accountCodeError && (
              <p className="text-xs text-rose-400 mt-1">{accountCodeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Group 3: Experience & Residence */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Experience & Regional Settings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your trading tenure, primary country, and desk timezone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={e => setExperienceLevel(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Beginner (< 1 Year)">Beginner (&lt; 1 Year)</option>
              <option value="Developing (1 - 3 Years)">Developing (1 - 3 Years)</option>
              <option value="Proficient (3 - 5 Years)">Proficient (3 - 5 Years)</option>
              <option value="5+ Years (Full-Time Funded)">5+ Years (Full-Time Funded)</option>
              <option value="Institutional Fund Trader">Institutional Fund Trader</option>
            </select>
          </div>

          <div className="relative space-y-1.5" ref={countryDropdownRef}>
            <label className="block text-xs font-semibold text-slate-200">Country / Tax Residence</label>
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(prev => !prev)}
              className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl px-3.5 py-2.5 text-white text-xs flex items-center justify-between hover:border-blue-500/50 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-base">{selectedCountryObj.flag}</span>
                <span className="truncate">{selectedCountryObj.name}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#12161D] border border-[#1C232E] rounded-xl shadow-2xl p-2 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                <div className="relative mb-2 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    placeholder="Search countries..."
                    autoFocus
                    className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="overflow-y-auto space-y-0.5 flex-1 pr-1 custom-scrollbar">
                  {filteredCountries.length === 0 ? (
                    <div className="text-slate-500 text-center py-3 text-xs">
                      No matching countries found
                    </div>
                  ) : (
                    filteredCountries.map(c => {
                      const isSelected = c.name === country;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountry(c.name);
                            setIsCountryDropdownOpen(false);
                            setCountrySearch('');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 text-blue-300 font-semibold'
                              : 'text-slate-300 hover:bg-[#1C232E]'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="text-base">{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group 4: Trading Philosophy & Bio */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#12161D] border border-[#1C232E] space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Trading Philosophy & Edge Bio</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Outline your primary edges, session habits, and market philosophy.
          </p>
        </div>

        <textarea
          rows={3}
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Outline your primary edges, core session habits, and market philosophy..."
          className="w-full bg-[#0A0D14] border border-[#1C232E] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition leading-relaxed"
        />
      </div>
    </form>
  );
};
