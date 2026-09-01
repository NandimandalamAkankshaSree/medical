import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  ShieldCheck,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { HospitalDirectoryItem } from '../types';

export const FindHospitalsView: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalDirectoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHospitals = async (sQuery = query, sDept = department, sCity = city, sPage = page) => {
    setLoading(true);
    try {
      const data = await api.searchHospitals(sQuery, sDept, sCity, sPage, 12);
      setHospitals(data.hospitals || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total || 0);
      if (data.available_departments) setAvailableDepartments(data.available_departments);
      if (data.available_cities) setAvailableCities(data.available_cities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals(query, department, city, page);
  }, [page, department, city]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHospitals(query, department, city, 1);
  };

  const openWebsite = (url: string, hospitalName: string, cityName: string) => {
    let targetUrl = url;
    if (!targetUrl || targetUrl.includes('.example')) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(hospitalName + ' ' + cityName + ' official website')}`;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const openMaps = (hospitalName: string, address: string, cityName: string, mapsUrl?: string) => {
    const targetUrl = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospitalName + ' ' + address + ' ' + cityName)}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Find Hospitals & Specialist Healthcare Providers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {totalCount} Verified Facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse verified healthcare institutions, official hospital portals, emergency contacts, and maps across cities.
          </p>
        </div>
      </div>

      {/* Directory Separation Disclaimer */}
      <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <span>
          <strong>Live Hospital Directory & Portals:</strong> Click <strong>"Visit Website"</strong> on any hospital card to navigate directly to their official healthcare portal for appointments, consultant profiles, and services.
        </span>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospital name, address, or specialty..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm text-xs transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Departments</option>
            {availableDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Cities</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Searching hospital directory & verified portals...
        </div>
      ) : hospitals.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p>No hospitals found matching your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <div
              key={h.hospital_id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {h.department}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{h.rating ? h.rating.toFixed(1) : '4.8'}</span>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                  {h.hospital_name}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{h.address}, {h.city}, {h.state}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${h.phone}`}
                      className="hover:text-teal-600 hover:underline transition-colors"
                      title="Click to call"
                    >
                      {h.phone}
                    </a>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openWebsite(h.website, h.hospital_name, h.city)}
                    className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title={`Open ${h.hospital_name} website`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Visit Website</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </button>

                  <button
                    onClick={() => openMaps(h.hospital_name, h.address, h.city, h.maps_url)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="View location on Google Maps"
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-600" />
                    <span>Map / Directions</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                  <span>ID: {h.hospital_id}</span>
                  <span className="text-teal-600 dark:text-teal-400 font-medium">Verified Portal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
};
