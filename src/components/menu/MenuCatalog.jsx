import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import CategoryFilter from './CategoryFilter';
import ProductCard from './ProductCard';

export default function MenuCatalog({ categories, products, menuRef }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category check
      const matchesCategory =
        selectedCategory === 'all' ||
        categories.find(
          (c) => c.slug === selectedCategory && c.id === product.category_id
        );

      // Search query check
      const matchesSearch =
        !searchQuery.trim() ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description &&
          product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [products, categories, selectedCategory, searchQuery]);

  return (
    <section ref={menuRef} id="menu" className="py-12 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-gold-600">
              DISCOVER OUR MENU
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-forest-950">
              What are you craving?
            </h2>
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meals, snacks, drinks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-800 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Category Filters */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Products Grid: 3-column desktop, 2-column tablet, 1-column mobile */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-dashed border-stone-300 p-8">
            <p className="font-serif text-lg text-stone-600">No dishes found</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              We couldn't find any meals matching "{searchQuery}". Try searching for another item or resetting filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-forest-800 hover:text-gold-600 underline pt-2"
            >
              View all meals
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
