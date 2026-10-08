import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  LogOut,
  ShieldCheck,
  Key,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle2,
  Database,
  Eye,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';
import { GitHubIcon } from './Icons';
import { GitHubAuthService, GitHubUserProfile } from '../../services/githubAuth';
import { GitHubService } from '../../services/github';
import { StorageService } from '../../services/storage';
import { CryptoService } from '../../services/cryptoService';

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPrivacyError(false);
      GitHubAuthService.getUserProfile().then((p) => {
        setProfile(p);
      });
      GitHubAuthService.getStoredToken().then((t) => {
        setTokenInput(t);
        if (t) setPrivacyAgreed(true);
      });
    }
  }, [isOpen]);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter your GitHub Personal Access Token (PAT).');
      return;
    }

    if (!privacyAgreed) {
      setPrivacyError(true);
      setError('Please agree to the Data Privacy & Intended Use Policy before connecting.');
      return;
    }

    setLoading(true);
    setError(null);
    setPrivacyError(false);

    try {
      const userProf = await GitHubAuthService.verifyAndStoreToken(tokenInput.trim());
      setProfile(userProf);
      GitHubService.setAuthenticatedQuota(5000);
      await StorageService.clearAllRepoCaches();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate token with GitHub. Please verify token permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await GitHubAuthService.logout();
    await StorageService.clearAllRepoCaches();
    setProfile(null);
    setTokenInput('');
    setPrivacyAgreed(false);
    setError(null);
    if (onAuthSuccess) onAuthSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/60 backdrop-blur-sm font-sans select-none overflow-y-auto">
      {/* Background polka dot overlay texture in backdrop */}
      <div className="absolute inset-0 bg-polka-pattern opacity-40 pointer-events-none" />

      {/* Main Responsive Split Card Container */}
      <div className="relative w-full max-w-4xl bg-white border border-zinc-300 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-zinc-400 hover:text-zinc-900 bg-white/90 hover:bg-zinc-100 border border-zinc-200 rounded-full transition-all cursor-pointer shadow-xs"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {profile ? (
          /* ========================================================== */
          /* SIGNED IN VIEW - Monochrome Clean Profile State           */
          /* ========================================================== */
          <div className="p-6 sm:p-10 space-y-6 bg-white">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-200">
              <img
                src={profile.avatarUrl}
                alt={profile.login}
                className="w-16 h-16 rounded-2xl border-2 border-zinc-900 bg-zinc-100 shadow-md object-cover"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-zinc-900">{profile.name || profile.login}</h3>
                  <span className="text-[11px] font-mono font-bold bg-zinc-900 text-white px-2.5 py-0.5 rounded-full">
                    Authenticated
                  </span>
                </div>
                <a
                  href={profile.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-zinc-600 hover:text-black underline flex items-center gap-1"
                >
                  @{profile.login} <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-zinc-900" /> Active Rate Limit
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white">
                    5,000 req/hr
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Your GitHub connection is active. All repositories are inspected with high-rate API quota.
                </p>
              </div>

              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-zinc-900" /> Local Vault Status
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-900">
                    AES-GCM Local
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-700 truncate">
                  Token: {CryptoService.maskToken(tokenInput)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-zinc-900" />
                <span>Disconnect & Sign Out</span>
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-[1.01]"
              >
                Continue to App
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* SIGN IN VIEW - Responsive 2-Column Minimalist Redesign      */
          /* Left Side: GitHub Sign-in with Black Button + Token Form   */
          /* Right Side: Benefits with Check Icons + Expandable Security*/
          /* ========================================================== */
          <div className="flex flex-col lg:flex-row w-full min-h-[520px]">
            {/* -------------------------------------------------------- */}
            {/* LEFT COLUMN: Clean Minimalist Sign In Form               */}
            {/* -------------------------------------------------------- */}
            <div className="w-full lg:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-white relative">
              <div className="space-y-6">
                {/* App Brand Header */}
                <div className="flex items-center gap-3">
                  <img
                    src="./domoscope.png"
                    alt="DomoScope Logo"
                    className="w-10 h-10 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-300 shadow-sm"
                  />
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-zinc-900">DomoScope</h2>
                    <p className="text-xs text-zinc-500 font-mono">GitHub Intelligence Platform</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                    Welcome back
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    Connect your GitHub Personal Access Token to unlock <strong>5,000 requests/hour</strong> and inspect public or private repositories.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-xl flex items-start gap-2.5 text-xs text-zinc-900">
                    <AlertCircle className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                    <span className="leading-snug font-medium">{error}</span>
                  </div>
                )}

                {/* Main Auth Form */}
                <form onSubmit={handleSaveToken} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-zinc-900" />
                        <span>Personal Access Token (PAT)</span>
                      </span>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=DomoScope"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-zinc-900 hover:text-black font-semibold underline flex items-center gap-1"
                      >
                        <span>Generate on GitHub</span>
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => {
                        setTokenInput(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 focus:bg-white transition-all shadow-inner"
                    />
                  </div>

                  {/* Data Privacy & Intended Use Checkbox */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    privacyError
                      ? 'border-zinc-900 bg-zinc-100 ring-1 ring-zinc-900'
                      : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300'
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => {
                          setPrivacyAgreed(e.target.checked);
                          if (e.target.checked) setPrivacyError(false);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer accent-zinc-900"
                      />
                      <span className="text-[11px] sm:text-xs text-zinc-700 leading-relaxed font-sans">
                        I confirm this token will be used <strong>strictly for repository analysis</strong> without abuse, scraping spam, or rate-limit violations. I agree to DomoScope's{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowPrivacyModal(true);
                          }}
                          className="text-zinc-900 font-bold underline hover:text-black focus:outline-none cursor-pointer inline-flex items-center gap-0.5"
                        >
                          Data Privacy Policy
                        </button>.
                      </span>
                    </label>
                  </div>

                  {/* Primary Black Action Button with GitHub Icon */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-black active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <GitHubIcon className="w-5 h-5 text-white" />
                    <span>{loading ? 'Verifying with GitHub...' : 'Sign in with GitHub Token'}</span>
                  </button>
                </form>

                {/* Collapsible Token Generation & Permission Guide */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSetupGuide((prev) => !prev)}
                    className="w-full py-2 px-3 text-[11px] font-mono font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/70 border border-zinc-200 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Need help? Token Setup & Scopes Guide</span>
                    {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showSetupGuide && (
                    <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-[11px] text-zinc-700 animate-in fade-in duration-150 font-sans">
                      <div className="space-y-1">
                        <p className="font-bold text-zinc-900">Recommended Token Scopes:</p>
                        <ul className="space-y-1 list-disc list-inside text-zinc-600">
                          <li><strong>Public repos:</strong> No scopes required (leave blank).</li>
                          <li><strong>Private repos:</strong> Check only the <code className="px-1 bg-zinc-200 rounded font-mono">repo</code> checkbox.</li>
                        </ul>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-200">
                        Tokens never leave your device. They are stored locally in encrypted browser storage.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer Note */}
              <div className="pt-6 text-center lg:text-left text-[11px] text-zinc-400 font-mono">
                DomoScope operates client-side · Read-only API calls
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* RIGHT COLUMN: Benefits & Expandable Security Panel        */}
            {/* Textured with subtle polka dot gray pattern              */}
            {/* -------------------------------------------------------- */}
            <div className="w-full lg:w-1/2 p-6 sm:p-8 md:p-10 bg-zinc-950 text-white flex flex-col justify-between relative overflow-hidden border-t lg:border-t-0 lg:border-l border-zinc-800">
              {/* Polka Dot Texture Layer */}
              <div className="absolute inset-0 bg-polka-pattern-dark opacity-20 pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Hero Headline on Dark Background */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>100% Private & Safe</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Explore, map, and understand any codebase with complete privacy.
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Designed for engineers who need deep repository intelligence without compromising credentials or codebase secrecy.
                  </p>
                </div>

                {/* Benefits List with Check Icons */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">5,000 Requests/Hour Quota</h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Say goodbye to standard 60 req/hr limits. Full deep AST code graph indexing for massive repos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Private Repository Access</h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Seamlessly inspect internal microservices, private libraries, and proprietary architectures.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Real-Time Branch & Commit Sync</h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Instantly shift between active branches, PR commits, and release tags without clone overhead.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Zero Server Ingestion</h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Analysis runs 100% locally in your browser. We never store, mirror, or forward your source code.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable Security Details Accordion */}
                <div className="border border-white/15 rounded-2xl bg-white/5 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setIsSecurityExpanded((prev) => !prev)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-white shrink-0" />
                      <span className="text-xs font-bold text-white">Security & Encryption Details</span>
                    </div>
                    {isSecurityExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  {isSecurityExpanded && (
                    <div className="p-4 pt-0 space-y-3 text-xs text-zinc-300 border-t border-white/10 bg-black/30 font-sans animate-in fade-in duration-150">
                      <div className="flex items-start gap-2 pt-3">
                        <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block text-[11px]">AES-GCM Web Crypto:</strong>
                          <span className="text-[11px] text-zinc-400">Tokens are encrypted before being saved in your device's IndexedDB. Never exported to plain text.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block text-[11px]">Zero Third-Party Telemetry:</strong>
                          <span className="text-[11px] text-zinc-400">DomoScope transmits no code, tokens, or repo metadata to external analytics or ad trackers.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <FileCheck2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block text-[11px]">Instant Token Revocation:</strong>
                          <span className="text-[11px] text-zinc-400">Revoke your token at any moment in your GitHub Settings. DomoScope holds zero persistent locks.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Security Badge */}
              <div className="relative z-10 pt-6 flex items-center justify-between text-[11px] text-zinc-400 font-mono border-t border-white/10 mt-6">
                <span>DomoScope Client Engine</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span>100% Client-Side Safe</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* DATA PRIVACY & LOCAL ARCHITECTURE MODAL CARD              */}
      {/* Normal White & Black theme with Agree button               */}
      {/* ========================================================== */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md font-sans animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-zinc-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-zinc-900" />
                <h3 className="text-base font-bold text-zinc-900">Data Privacy & Local Guarantee</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                aria-label="Close policy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-zinc-700 leading-relaxed font-sans">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center gap-3">
                <img
                  src="./domoscope.png"
                  alt="DomoScope"
                  className="w-10 h-10 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-300 shrink-0"
                />
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">100% Client-Side Architecture</h4>
                  <p className="text-[11px] text-zinc-500 font-mono">DomoScope does not operate backend storage servers.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 border border-zinc-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs">
                    <Database className="w-3.5 h-3.5 text-zinc-900" /> 1. No Code or Data Ingestion
                  </h5>
                  <p className="text-zinc-600 text-[11px]">
                    Your repository files, AST graph nodes, commit histories, and code snippets are parsed exclusively inside your browser runtime. DomoScope never uploads, mirrors, or trains models on your code.
                  </p>
                </div>

                <div className="p-3.5 border border-zinc-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5 text-zinc-900" /> 2. Encrypted Local Storage Only
                  </h5>
                  <p className="text-zinc-600 text-[11px]">
                    Your Personal Access Token (PAT) is encrypted with modern AES-GCM cryptography and stored directly in your browser's private IndexedDB vault. It is never logged or exposed in network traffic.
                  </p>
                </div>

                <div className="p-3.5 border border-zinc-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5 text-zinc-900" /> 3. Strictly Intended Read-Only Use
                  </h5>
                  <p className="text-zinc-600 text-[11px]">
                    By using this tool, you confirm that your token is intended for legitimate architecture exploration and developer insights. DomoScope executes only read operations and never alters your code, branches, or settings.
                  </p>
                </div>

                <div className="p-3.5 border border-zinc-200 rounded-xl space-y-1">
                  <h5 className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs">
                    <FileCheck2 className="w-3.5 h-3.5 text-zinc-900" /> 4. Full User Sovereignty
                  </h5>
                  <p className="text-zinc-600 text-[11px]">
                    You can clear all local caches and delete your stored token at any time by clicking "Disconnect & Sign Out" or directly in your GitHub token management page.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-zinc-500">
                Zero telemetry · 100% private
              </span>
              <button
                type="button"
                onClick={() => {
                  setPrivacyAgreed(true);
                  setPrivacyError(false);
                  setShowPrivacyModal(false);
                }}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-[1.01]"
              >
                I Agree to Privacy Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
