import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HeroSection({ onExploreClick }) {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-forest-800 text-cream-50 p-8 sm:p-14 lg:p-16 shadow-elevated border border-forest-700/60 overflow-hidden">
          {/* Subtle gold floral / pattern accents */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-forest-700/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gold-600/10 blur-3xl pointer-events-none" />

          <div className="max-w-2xl relative z-10 space-y-6">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-900/80 border border-gold-500/40 text-gold-400 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>FRESHLY MADE · MADE WITH LOVE</span>
            </div>

            {/* Main heading */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-cream-50 leading-[1.15]">
              Good food. <br />
              <span className="text-gold-400 italic font-serif">Northern taste.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-cream-200/90 font-light leading-relaxed max-w-xl">
              Your favourite meals, snacks and refreshing drinks — order fresh from Northern Flavors Restaurant.
            </p>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={onExploreClick}
                className="inline-flex items-center gap-3 bg-gold-500 hover:bg-gold-400 text-forest-950 font-bold px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base"
              >
                <span>Explore menu</span>
                <ArrowRight className="w-4 h-4 text-forest-950 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
