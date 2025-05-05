"use client";

import type * as React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ItemSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function ItemSearch({
  searchQuery,
  onSearchChange,
  placeholder = "Search items by name..."
}: ItemSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg bg-background pl-10"
        aria-label="Search items"
      />
    </div>
  );
}
