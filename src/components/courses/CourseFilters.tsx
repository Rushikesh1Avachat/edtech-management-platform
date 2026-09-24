'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CourseFiltersProps {
  categories: Category[];
}

export default function CourseFilters({ categories }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.set('page', '1'); // Reset pagination on filter change
      return params.toString();
    },
    [searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${pathname}?${createQueryString('search', searchTerm)}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    router.push(`${pathname}?${createQueryString(key, value)}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    router.push(pathname);
  };

  const currentLevel = searchParams.get('level') || '';
  const currentCategory = searchParams.get('categoryId') || '';

  const hasActiveFilters = Boolean(searchTerm || currentLevel || currentCategory);

  return (
    <div className="glass-panel p-4 rounded-2xl mb-8 border border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
      <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses by title or topic..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900/80 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-700/60 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </form>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" /> Filters:
        </div>

        {/* Level Dropdown */}
        <select
          value={currentLevel}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="bg-gray-900/80 text-gray-200 text-xs py-2 px-3 rounded-xl border border-gray-700/60 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>

        {/* Category Dropdown */}
        <select
          value={currentCategory}
          onChange={(e) => handleFilterChange('categoryId', e.target.value)}
          className="bg-gray-900/80 text-gray-200 text-xs py-2 px-3 rounded-xl border border-gray-700/60 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
