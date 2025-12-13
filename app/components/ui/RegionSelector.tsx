'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegion, REGIONS, Region } from '@/app/lib/context/RegionContext';

interface RegionSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function RegionSelector({ variant = 'default', className = '' }: RegionSelectorProps) {
  const { region, setRegion } = useRegion();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRegions = REGIONS.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (r: Region) => {
    setRegion(r);
    setIsOpen(false);
    setSearch('');
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && mounted && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 99999,
          }}
          className="w-72 bg-gray-900 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredRegions.map((r) => (
              <button
                key={r.code || 'all'}
                onClick={() => handleSelect(r)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors ${
                  region.code === r.code ? 'bg-white/10 text-white' : 'text-gray-300'
                }`}
              >
                <span className="text-xl">{r.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  {r.code && <div className="text-xs text-gray-500">{r.code}</div>}
                </div>
                {region.code === r.code && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
        >
          <span className="text-base">{region.flag}</span>
          <span className="hidden sm:inline">{region.code || 'All'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        {mounted && createPortal(dropdownContent, document.body)}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors"
      >
        <span className="text-xl">{region.flag}</span>
        <div className="text-left">
          <div className="text-sm font-medium">{region.name}</div>
          <div className="text-xs text-gray-400">Content Region</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
}
