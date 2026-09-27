import React, { useState, useMemo } from 'react';
import { ApiEndpoint, RepoFile } from '../../types';
import { parseApiEndpoints } from '../../services/apiRouteCatalog';
import { Search, Globe, FileCode, Filter, ExternalLink, ShieldCheck } from 'lucide-react';

interface ApiCatalogTabProps {
  fileContents: Map<string, string>;
  files?: RepoFile[];
  onOpenFile?: (path: string) => void;
}

export const ApiCatalogTab: React.FC<ApiCatalogTabProps> = ({ fileContents, files, onOpenFile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const filesArray = useMemo(() => {
    const entries = new Map<string, string>(fileContents);
    if (files) {
      for (const f of files) {
        if (!entries.has(f.path)) {
          entries.set(f.path, '');
        }
      }
    }
    return Array.from(entries.entries()).map(([path, content]) => ({ path, content }));
  }, [fileContents, files]);

  const endpoints = useMemo(() => {
    return parseApiEndpoints(filesArray);
  }, [filesArray]);

  // Aggregate cloud breakdown
  const cloudBreakdown = useMemo(() => {
    let supabaseCount = 0;
    let cloudflareCount = 0;
    let awsCount = 0;
    let firebaseCount = 0;
    let vercelCount = 0;

    for (const ep of endpoints) {
      const prov = (ep.cloudService || ep.framework || '').toLowerCase();
      if (prov.includes('supabase')) supabaseCount++;
      else if (prov.includes('cloudflare')) cloudflareCount++;
      else if (prov.includes('aws') || prov.includes('lambda')) awsCount++;
      else if (prov.includes('firebase')) firebaseCount++;
      else if (prov.includes('vercel')) vercelCount++;
    }

    return {
      supabaseCount,
      cloudflareCount,
      awsCount,
      firebaseCount,
      vercelCount,
      hasCloudEndpoints: supabaseCount + cloudflareCount + awsCount + firebaseCount + vercelCount > 0,
    };
  }, [endpoints]);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchesSearch =
        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ep.summary && ep.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ep.cloudService && ep.cloudService.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMethod = methodFilter === 'all' || ep.method === methodFilter;

      let matchesService = true;
      if (serviceFilter !== 'all') {
        const prov = (ep.cloudService || ep.framework || '').toLowerCase();
        if (serviceFilter === 'supabase') matchesService = prov.includes('supabase');
        else if (serviceFilter === 'cloudflare') matchesService = prov.includes('cloudflare');
        else if (serviceFilter === 'aws') matchesService = prov.includes('aws') || prov.includes('lambda');
        else if (serviceFilter === 'firebase') matchesService = prov.includes('firebase');
        else if (serviceFilter === 'vercel') matchesService = prov.includes('vercel');
        else if (serviceFilter === 'standard') {
          matchesService = !ep.cloudService && !['supabase', 'cloudflare-worker', 'aws-lambda', 'firebase', 'vercel-serverless'].includes(ep.framework);
        }
      }

      return matchesSearch && matchesMethod && matchesService;
    });
  }, [endpoints, searchTerm, methodFilter, serviceFilter]);

  const getMethodBadgeColor = (method: ApiEndpoint['method']) => {
    switch (method) {
      case 'GET':
        return 'bg-zinc-100 text-zinc-900 border-zinc-300 font-mono font-bold';
      case 'POST':
        return 'bg-zinc-900 text-white border-zinc-900 font-mono font-bold';
      case 'PUT':
      case 'PATCH':
        return 'bg-zinc-200 text-zinc-900 border-zinc-400 font-mono font-bold';
      case 'DELETE':
        return 'bg-zinc-800 text-white border-zinc-800 font-mono font-bold';
      case 'QUERY':
      case 'MUTATION':
      case 'ALL':
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200 font-mono font-semibold';
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50 p-6 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-zinc-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-zinc-900" />
            <h2 className="text-xl font-bold text-zinc-900">API Route & Endpoint Catalog</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Auto-discovered REST, GraphQL, Next.js, FastAPI, Express, and client-side endpoints across your repository.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-xs text-xs text-zinc-700 font-medium">
          <ShieldCheck className="w-4 h-4 text-zinc-900" />
          <span>{endpoints.length} Active Endpoints Discovered</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 my-5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search API paths, controllers, or files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs transition-all text-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 hidden sm:block" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs cursor-pointer font-mono"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="QUERY">QUERY (GraphQL)</option>
            <option value="ALL">ALL (Wildcard / Handler)</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs cursor-pointer font-mono"
          >
            <option value="all">All Services</option>
            <option value="supabase">Supabase</option>
            <option value="cloudflare">Cloudflare Workers</option>
            <option value="aws">AWS Lambda</option>
            <option value="firebase">Firebase Functions</option>
            <option value="vercel">Vercel Serverless</option>
            <option value="standard">Standard Web Routes</option>
          </select>
        </div>
      </div>

      {/* Cloud Services Summary Banner */}
      {cloudBreakdown.hasCloudEndpoints && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Cloud Runtimes:</span>
          {cloudBreakdown.supabaseCount > 0 && (
            <button
              onClick={() => setServiceFilter(serviceFilter === 'supabase' ? 'all' : 'supabase')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                serviceFilter === 'supabase'
                  ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              Supabase ({cloudBreakdown.supabaseCount})
            </button>
          )}
          {cloudBreakdown.cloudflareCount > 0 && (
            <button
              onClick={() => setServiceFilter(serviceFilter === 'cloudflare' ? 'all' : 'cloudflare')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                serviceFilter === 'cloudflare'
                  ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              Cloudflare ({cloudBreakdown.cloudflareCount})
            </button>
          )}
          {cloudBreakdown.awsCount > 0 && (
            <button
              onClick={() => setServiceFilter(serviceFilter === 'aws' ? 'all' : 'aws')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                serviceFilter === 'aws'
                  ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              AWS Lambda ({cloudBreakdown.awsCount})
            </button>
          )}
          {cloudBreakdown.firebaseCount > 0 && (
            <button
              onClick={() => setServiceFilter(serviceFilter === 'firebase' ? 'all' : 'firebase')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                serviceFilter === 'firebase'
                  ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              Firebase ({cloudBreakdown.firebaseCount})
            </button>
          )}
          {cloudBreakdown.vercelCount > 0 && (
            <button
              onClick={() => setServiceFilter(serviceFilter === 'vercel' ? 'all' : 'vercel')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                serviceFilter === 'vercel'
                  ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              Vercel ({cloudBreakdown.vercelCount})
            </button>
          )}
        </div>
      )}

      {/* Endpoint Table */}
      <div className="flex-1 bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {filteredEndpoints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Globe className="w-12 h-12 text-zinc-300 mb-3 stroke-[1.5]" />
            <p className="text-zinc-800 font-semibold text-sm">No matching API endpoints found</p>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm">
              DomoScope indexes REST routes, Next.js routes, FastAPI decorators, Express routers, Supabase, Cloudflare, and AWS handlers.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase font-semibold text-zinc-600 tracking-wider font-mono">
                  <th className="py-3 px-6">Method</th>
                  <th className="py-3 px-6">Endpoint Path & Details</th>
                  <th className="py-3 px-6">Service / Framework</th>
                  <th className="py-3 px-6">Source File Location</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs sm:text-sm">
                {filteredEndpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${getMethodBadgeColor(
                          ep.method
                        )}`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-mono font-semibold text-zinc-900">{ep.path}</div>
                      {ep.summary && (
                        <div className="text-[11px] text-zinc-500 font-sans mt-0.5">{ep.summary}</div>
                      )}
                    </td>
                    <td className="py-3 px-6 capitalize text-zinc-600 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ep.cloudService && (
                          <span className="bg-zinc-900 text-white font-mono text-[11px] px-2 py-0.5 rounded font-bold shadow-2xs">
                            {ep.cloudService}
                          </span>
                        )}
                        <span className="bg-zinc-100 border border-zinc-200 text-zinc-800 px-2 py-0.5 rounded text-xs font-mono">
                          {ep.framework}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-zinc-500 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate max-w-[240px]">
                          {ep.file}:{ep.line}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right">
                      {onOpenFile && (
                        <button
                          onClick={() => onOpenFile(ep.file)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-black hover:underline cursor-pointer"
                        >
                          <span>View Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
