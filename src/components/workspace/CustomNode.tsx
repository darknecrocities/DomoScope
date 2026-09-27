import { Handle, Position } from '@xyflow/react';
import { FileCode, Database, Layers, Server, Globe, Sparkles } from 'lucide-react';
import { ArchitectureNodeData } from '../../types';

interface CustomNodeProps {
  data: ArchitectureNodeData;
  selected?: boolean;
}

export function CustomNode({ data, selected }: CustomNodeProps) {
  const theme = data.theme || 'light';
  const isDark = theme === 'dark';
  const isMonokai = theme === 'monokai';
  const isHeatmap = Boolean(data.heatmapMode);
  const isLR = data.rankDirection === 'LR';

  const health = data.healthColor || 'green';
  const score = data.complexityScore ?? 25;

  const getIcon = () => {
    let iconClass = 'w-3.5 h-3.5 shrink-0 ';
    if (isHeatmap) {
      if (health === 'red') iconClass += isDark || isMonokai ? 'text-rose-400' : 'text-rose-600';
      else if (health === 'yellow') iconClass += isDark || isMonokai ? 'text-amber-400' : 'text-amber-600';
      else iconClass += isDark || isMonokai ? 'text-emerald-400' : 'text-emerald-600';
    } else {
      if (isMonokai) iconClass += 'text-[#ffd866]';
      else if (isDark) iconClass += 'text-slate-300';
      else iconClass += 'text-zinc-600';
    }

    switch (data.category) {
      case 'database':
        return <Database className={iconClass} />;
      case 'api':
        return <Globe className={iconClass} />;
      case 'service':
        return <Server className={iconClass} />;
      case 'component':
        return <Layers className={iconClass} />;
      default:
        return <FileCode className={iconClass} />;
    }
  };

  // Card theme classes
  const getCardClasses = () => {
    const base = 'px-3 py-2.5 rounded-xl border text-left transition-all w-52 select-none';

    if (isHeatmap) {
      if (health === 'red') {
        const bg = isMonokai
          ? 'bg-[#3d1a24] border-[#f92672]/80 text-[#fcfcfa]'
          : isDark
          ? 'bg-rose-950/80 border-rose-600/70 text-rose-100'
          : 'bg-rose-50 border-rose-300 text-rose-950';
        const ring = selected
          ? isMonokai
            ? 'ring-2 ring-[#f92672] border-[#f92672] shadow-lg'
            : 'ring-2 ring-rose-500 border-rose-500 shadow-md'
          : 'shadow-xs hover:border-rose-400';
        return `${base} ${bg} ${ring}`;
      }

      if (health === 'yellow') {
        const bg = isMonokai
          ? 'bg-[#3b321c] border-[#e6db74]/80 text-[#fcfcfa]'
          : isDark
          ? 'bg-amber-950/80 border-amber-600/70 text-amber-100'
          : 'bg-amber-50 border-amber-300 text-amber-950';
        const ring = selected
          ? isMonokai
            ? 'ring-2 ring-[#e6db74] border-[#e6db74] shadow-lg'
            : 'ring-2 ring-amber-500 border-amber-500 shadow-md'
          : 'shadow-xs hover:border-amber-400';
        return `${base} ${bg} ${ring}`;
      }

      // green
      const bg = isMonokai
        ? 'bg-[#1b3823] border-[#a6e22e]/80 text-[#fcfcfa]'
        : isDark
        ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-100'
        : 'bg-emerald-50 border-emerald-300 text-emerald-950';
      const ring = selected
        ? isMonokai
          ? 'ring-2 ring-[#a6e22e] border-[#a6e22e] shadow-lg'
          : 'ring-2 ring-emerald-500 border-emerald-500 shadow-md'
        : 'shadow-xs hover:border-emerald-400';
      return `${base} ${bg} ${ring}`;
    }

    // Normal Theme
    if (isMonokai) {
      const bg = 'bg-[#2d2a2e] border-[#403e41] text-[#fcfcfa]';
      const ring = selected
        ? 'border-[#a6e22e] ring-2 ring-[#a6e22e]/40 shadow-lg'
        : 'hover:border-[#727072] shadow-md';
      return `${base} ${bg} ${ring}`;
    }

    if (isDark) {
      const bg = 'bg-slate-900 border-slate-700/80 text-slate-100';
      const ring = selected
        ? 'border-sky-400 ring-2 ring-sky-400/30 shadow-sky-500/20 shadow-lg'
        : 'hover:border-slate-500 shadow-md';
      return `${base} ${bg} ${ring}`;
    }

    // Light
    const bg = 'bg-white border-zinc-200 text-zinc-900';
    const ring = selected
      ? 'border-zinc-900 ring-2 ring-zinc-900/15 shadow-md'
      : 'hover:border-zinc-400 shadow-xs';
    return `${base} ${bg} ${ring}`;
  };

  // Text color helpers
  const labelColor = isHeatmap
    ? health === 'red'
      ? isDark || isMonokai ? 'text-rose-100' : 'text-rose-950'
      : health === 'yellow'
      ? isDark || isMonokai ? 'text-amber-100' : 'text-amber-950'
      : isDark || isMonokai ? 'text-emerald-100' : 'text-emerald-950'
    : isMonokai
    ? 'text-[#fcfcfa]'
    : isDark
    ? 'text-slate-100'
    : 'text-zinc-900';

  const metaColor = isHeatmap
    ? health === 'red'
      ? isDark || isMonokai ? 'text-rose-300' : 'text-rose-700'
      : health === 'yellow'
      ? isDark || isMonokai ? 'text-amber-300' : 'text-amber-700'
      : isDark || isMonokai ? 'text-emerald-300' : 'text-emerald-700'
    : isMonokai
    ? 'text-[#939293]'
    : isDark
    ? 'text-slate-400'
    : 'text-zinc-500';

  const handleClass = isHeatmap
    ? health === 'red'
      ? '!bg-rose-500 !w-2.5 !h-2.5 !border !border-white'
      : health === 'yellow'
      ? '!bg-amber-500 !w-2.5 !h-2.5 !border !border-white'
      : '!bg-emerald-500 !w-2.5 !h-2.5 !border !border-white'
    : isMonokai
    ? '!bg-[#a6e22e] !w-2.5 !h-2.5 !border !border-[#2d2a2e]'
    : isDark
    ? '!bg-slate-400 !w-2.5 !h-2.5 !border !border-slate-800'
    : '!bg-zinc-400 !w-2.5 !h-2.5 !border !border-white';

  const heatBarColor =
    health === 'red'
      ? isMonokai ? 'bg-[#f92672]' : 'bg-rose-500'
      : health === 'yellow'
      ? isMonokai ? 'bg-[#e6db74]' : 'bg-amber-500'
      : isMonokai ? 'bg-[#a6e22e]' : 'bg-emerald-500';

  return (
    <div className={getCardClasses()}>
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        className={handleClass}
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {getIcon()}
          <span className={`text-xs font-bold truncate font-mono ${labelColor}`} title={data.label}>
            {data.label}
          </span>
        </div>
        {data.isEntryPoint && (
          <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-mono font-bold tracking-tight bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
            ENTRY
          </span>
        )}
      </div>

      <div className={`flex items-center justify-between text-[10px] font-mono ${metaColor}`}>
        <span className="capitalize truncate max-w-[110px]">{data.subtitle || data.category}</span>
        {data.badge ? (
          <span className="font-semibold text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            {data.badge}
          </span>
        ) : isHeatmap ? (
          <span className="font-semibold">
            {health === 'red' ? 'Heavy' : health === 'yellow' ? 'Moderate' : 'Healthy'} ({score})
          </span>
        ) : (
          data.importsCount > 0 && <span>{data.importsCount} deps</span>
        )}
      </div>

      {isHeatmap && (
        <div className="w-full h-1 bg-black/10 dark:bg-white/15 rounded-full mt-1.5 overflow-hidden">
          <div
            className={`h-full ${heatBarColor} rounded-full transition-all`}
            style={{ width: `${Math.min(100, Math.max(12, score))}%` }}
          />
        </div>
      )}

      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        className={handleClass}
      />
    </div>
  );
}
