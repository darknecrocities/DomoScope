import { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
  FolderGit2,
  Layers,
  Cpu,
  Database,
  Sparkles,
} from 'lucide-react';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { LoadingStep } from '../../hooks/useRepository';

export interface VerificationCheck {
  id: string;
  stepKeyword: string;
  title: string;
  detail: string;
  icon: typeof FolderGit2;
}

export const VERIFICATION_CHECKS: VerificationCheck[] = [
  {
    id: 'repo-access',
    stepKeyword: 'Checking repository',
    title: 'Checking repository & branch accessibility',
    detail: 'Validating GitHub repository, default branch & commit HEAD',
    icon: FolderGit2,
  },
  {
    id: 'file-tree',
    stepKeyword: 'Reading files',
    title: 'Reading file tree & package manifests',
    detail: 'Cataloging project files, configs & dependency declarations',
    icon: Layers,
  },
  {
    id: 'architecture',
    stepKeyword: 'Understanding structure',
    title: 'Understanding architecture & framework engine',
    detail: 'Detecting frameworks, UI components & service layers',
    icon: Cpu,
  },
  {
    id: 'relational-models',
    stepKeyword: 'Building project map',
    title: 'Building relational models & project map',
    detail: 'Synthesizing database schemas, tables & dependency graph',
    icon: Database,
  },
  {
    id: 'security-prep',
    stepKeyword: 'Preparing workspace',
    title: 'Verifying security posture & preparing workspace',
    detail: 'Scanning vulnerability patterns & initializing interactive views',
    icon: ShieldCheck,
  },
];

interface RepoLoadingProgressProps {
  owner: string;
  repo: string;
  loadingStep: LoadingStep;
  isDataReady: boolean;
  onProceed: () => void;
  isFullScreen?: boolean;
}

export function RepoLoadingProgress({
  owner,
  repo,
  loadingStep,
  isDataReady,
  onProceed,
  isFullScreen = true,
}: RepoLoadingProgressProps) {
  // Current active step index (0 to 4)
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // Set of verified completed check step indices
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  // Whether all 5 checks have reached 100% verified status
  const [isAllComplete, setIsAllComplete] = useState(false);
  // Progress percentage (0 to 100)
  const [progressPercent, setProgressPercent] = useState(15);

  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const proceedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map incoming useRepository loadingStep to an index
  const repoStepIndex = (() => {
    switch (loadingStep) {
      case 'Checking repository':
        return 0;
      case 'Reading files':
        return 1;
      case 'Understanding structure':
        return 2;
      case 'Building project map':
        return 3;
      case 'Preparing workspace':
      case 'done':
        return 4;
      default:
        return 0;
    }
  })();

  // Controlled sequential progress pacing
  useEffect(() => {
    // If all checks are completed, trigger proceed after a short confirmation window
    if (isAllComplete) {
      proceedTimeoutRef.current = setTimeout(() => {
        onProceed();
      }, 500);
      return () => {
        if (proceedTimeoutRef.current) clearTimeout(proceedTimeoutRef.current);
      };
    }

    stepTimerRef.current = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        // If data is ready, we fast-forward smoothly to completion
        const targetMax = isDataReady ? 5 : Math.max(prevIndex, repoStepIndex);

        if (prevIndex < targetMax) {
          const nextIndex = prevIndex + 1;
          setCompletedSteps((prev) => Array.from(new Set([...prev, prevIndex])));

          if (nextIndex >= 5) {
            setCompletedSteps([0, 1, 2, 3, 4]);
            setProgressPercent(100);
            setIsAllComplete(true);
            if (stepTimerRef.current) clearInterval(stepTimerRef.current);
            return 5;
          }

          setProgressPercent(Math.min(95, (nextIndex + 1) * 20));
          return nextIndex;
        }

        // Keep pace matched to backend progress
        if (repoStepIndex > prevIndex) {
          const nextIndex = prevIndex + 1;
          setCompletedSteps((prev) => Array.from(new Set([...prev, prevIndex])));
          setProgressPercent(Math.min(95, (nextIndex + 1) * 20));
          return nextIndex;
        }

        return prevIndex;
      });
    }, isDataReady ? 180 : 380);

    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [isDataReady, repoStepIndex, isAllComplete, onProceed]);

  const activeCheck = VERIFICATION_CHECKS[Math.min(currentStepIndex, 4)];

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200 ${
        isFullScreen ? 'min-h-screen bg-white' : 'flex-1 h-full bg-white'
      }`}
    >
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Header App Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 stroke-[2]" />
          </div>
          {isAllComplete ? (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center shadow-xs border-2 border-white animate-in zoom-in">
              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          ) : (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border-2 border-white animate-ping" />
          )}
        </div>

        {/* Title & Status Narrative */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight font-sans">
            Checking & Analyzing {owner}/{repo}
          </h2>
          <p className="text-xs text-zinc-500 font-mono">
            {isAllComplete
              ? 'All repository checks completed! Entering workspace...'
              : `Executing step ${Math.min(currentStepIndex + 1, 5)} of 5: ${activeCheck.title}`}
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-600 font-medium truncate max-w-[260px] text-left">
              {isAllComplete ? 'Status: 100% Verified' : activeCheck.stepKeyword}
            </span>
            <span className="text-zinc-950 font-bold">
              <AnimatedCounter value={progressPercent} />%
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/80 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-zinc-950"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Comprehensive Verification Checklist */}
        <div className="p-4 bg-zinc-50/80 border border-zinc-200 rounded-2xl space-y-3 text-left shadow-2xs">
          {VERIFICATION_CHECKS.map((check, idx) => {
            const isCompleted = completedSteps.includes(idx);
            const isCurrent = currentStepIndex === idx && !isAllComplete;
            const Icon = check.icon;

            return (
              <div
                key={check.id}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-3 ${
                  isCompleted
                    ? 'bg-white border-zinc-200/90 shadow-2xs'
                    : isCurrent
                    ? 'bg-white border-zinc-900 shadow-xs'
                    : 'bg-transparent border-transparent opacity-50'
                }`}
              >
                {/* State Badge Icon */}
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center shadow-2xs border border-zinc-900">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-400 text-zinc-900 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-900" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-300">
                      <Circle className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Check Text & Subdetail */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-mono block truncate ${
                        isCompleted
                          ? 'text-zinc-900 font-bold'
                          : isCurrent
                          ? 'text-zinc-950 font-bold'
                          : 'text-zinc-400 font-normal'
                      }`}
                    >
                      {check.title}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-white font-bold shrink-0">
                        Passed
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isCompleted ? 'text-zinc-500' : isCurrent ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {check.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Confirmation Notice */}
        {isAllComplete && (
          <div className="flex items-center justify-center gap-2 p-3 bg-zinc-950 text-white rounded-xl text-xs font-mono font-semibold animate-in fade-in slide-in-from-bottom-2 shadow-sm border border-zinc-800">
            <Check className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
            <span>All repository checks complete. Proceeding to workspace...</span>
          </div>
        )}
      </div>
    </div>
  );
}
