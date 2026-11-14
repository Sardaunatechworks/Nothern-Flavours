import React from 'react';

export default function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.slug;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              isSelected
                ? 'bg-forest-800 text-gold-400 shadow-sm border border-forest-900'
                : 'bg-white text-stone-600 hover:text-forest-900 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
