import { useState, useRef } from 'react';
import { Eye, Split, FileCode, Network, ArrowLeftRight, Check } from 'lucide-react';

const LENS_PRESETS = [
  {
    id: 'router',
    label: 'Page Navigation',
    rawCode: `// src/router/AppRoutes.tsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/Loading';

const Dashboard = lazy(() => import('../views/Dashboard'));
const Settings = lazy(() => import('../views/Settings'));
const UserProfile = lazy(() => import('../views/Profile'));
const AuditLog = lazy(() => import('../views/Audit'));

export function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return (
    <Routes>
      <Route path="/" element={<Dashboard user={user} />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/audit" element={<AuditLog />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}`,
    visualNodes: [
      { name: 'AppRoutes.tsx', type: 'Main Navigation', status: 'Starting Point' },
      { name: 'useAuth.ts', type: 'Sign-in State', status: 'Connected' },
      { name: 'Dashboard.tsx', type: 'Home Screen', status: 'Opens /' },
      { name: 'Settings.tsx', type: 'Account Settings', status: 'Opens /settings' },
      { name: 'AuditLog.tsx', type: 'Activity History', status: 'Opens /audit' },
    ],
  },
  {
    id: 'schema',
    label: 'Database Structure',
    rawCode: `// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        String    @id @default(uuid())
  name      String
  users     User[]
  createdAt DateTime  @default(now())
}

model User {
  id             String        @id @default(uuid())
  email          String        @unique
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id])
  projects       Project[]
}`,
    visualNodes: [
      { name: 'Organization', type: 'Company Profile', status: 'Has multiple members' },
      { name: 'User', type: 'Team Member', status: 'Belongs to company, owns projects' },
      { name: 'Project', type: 'Workspace Project', status: 'Linked to assigned owner' },
    ],
  },
];

export function ArchitectureLens() {
  const [activePreset, setActivePreset] = useState(0);
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const current = LENS_PRESETS[activePreset];

  const handleMouseMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
    const onMove = (e: MouseEvent) => {
      if (isDragging.current) handleMouseMove(e.clientX);
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMouseMove(e.touches[0].clientX);
    }
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto border-t border-zinc-200">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600">
          <Eye className="w-3.5 h-3.5 text-zinc-700" />
          <span>Interactive Visual Lens</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Slide to compare: Raw code vs Visual map
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
          See how DomoScope turns complex code into clean, friendly cards that anyone can easily follow.
        </p>
      </div>

      {/* Preset Tabs */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {LENS_PRESETS.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setActivePreset(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              activePreset === idx
                ? 'bg-zinc-900 text-white shadow-xs font-medium'
                : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Interactive Split Lens Box */}
      <div
        ref={containerRef}
        onTouchMove={handleTouchMove}
        className="relative h-[420px] rounded-xl border border-zinc-200 bg-zinc-900 shadow-xl overflow-hidden select-none"
      >
        {/* Underneath Layer: DomoScope Visual Clarity (Right side revealed) */}
        <div className="absolute inset-0 bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <Network className="w-4 h-4 text-zinc-800" />
              <span>DomoScope Visual Map</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
              Visual Preview
            </span>
          </div>

          {/* Visual Node Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-auto">
            {current.visualNodes.map((n, i) => (
              <div
                key={i}
                className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl shadow-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-900" />
                  <span className="text-xs font-mono font-bold text-zinc-900 truncate">
                    {n.name}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-zinc-600">{n.type}</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-1">{n.status}</div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 font-mono text-center">
            Diagrams update automatically as your project grows.
          </div>
        </div>

        {/* Top Layer: Raw GitHub Source Code (Left side, clipped by slider) */}
        <div
          className="absolute inset-y-0 left-0 bg-zinc-950 p-6 overflow-hidden border-r border-zinc-700"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="min-w-[440px]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-zinc-400" />
                <span>Raw GitHub Source Code</span>
              </div>
              <span>TypeScript</span>
            </div>

            <pre className="font-mono text-xs text-zinc-300 leading-relaxed overflow-x-hidden">
              <code>{current.rawCode}</code>
            </pre>
          </div>
        </div>

        {/* Draggable Divider Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize group"
          style={{ left: `calc(${sliderPos}% - 14px)`, width: '28px' }}
        >
          <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-white shadow-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 px-2">
        <span>◀ Raw Code</span>
        <span>Drag slider to compare</span>
        <span>Visual Map ▶</span>
      </div>
    </section>
  );
}
