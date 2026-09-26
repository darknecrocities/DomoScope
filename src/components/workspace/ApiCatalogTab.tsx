import React, { useState, useMemo } from 'react';
import { ApiEndpoint } from '../../types';
import { parseApiEndpoints } from '../../services/apiRouteCatalog';
import { Search, Globe, FileCode, Filter, ExternalLink, ShieldCheck } from 'lucide-react';

interface ApiCatalogTabProps {
  fileContents: Map<string, string>;
  onOpenFile?: (path: string) => void;
}

export const ApiCatalogTab: React.FC<ApiCatalogTabProps> = ({ fileContents, onOpenFile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filesArray = useMemo(() => {
    return Array.from(fileContents.entries()).map(([path, content]) => ({ path, content }));
  }, [fileContents]);

  const endpoints = useMemo(() => {
    return parseApiEndpoints(filesArray);
  }, [filesArray]);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchesSearch =
        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ep.summary && ep.summary.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMethod = methodFilter === 'all' || ep.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [endpoints, searchTerm, methodFilter]);

  const getMethodBadgeColor = (method: ApiEndpoint['method']) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'POST':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'QUERY':
      case 'MUTATION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-6 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">API Route & Endpoint Catalog</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auto-discovered REST, GraphQL, gRPC, and Client HTTP endpoints across your codebase.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{endpoints.length} Active Endpoints Discovered</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 my-5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search API paths, controllers, or files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="QUERY">QUERY (GraphQL)</option>
          </select>
        </div>
      </div>

      {/* Endpoint Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {filteredEndpoints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Globe className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No matching API endpoints found</p>
            <p className="text-slate-400 text-xs mt-1">
              Ensure your backend controllers or HTTP clients are indexed or adjust your search filter.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-6">Method</th>
                  <th className="py-3.5 px-6">Endpoint Path</th>
                  <th className="py-3.5 px-6">Framework / Type</th>
                  <th className="py-3.5 px-6">Source File Location</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEndpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getMethodBadgeColor(
                          ep.method
                        )}`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono font-semibold text-slate-800">
                      {ep.path}
                    </td>
                    <td className="py-3.5 px-6 capitalize text-slate-600 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                        {ep.framework}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {ep.file}:{ep.line}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onOpenFile && onOpenFile(ep.file)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
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
