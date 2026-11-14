import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center mx-auto text-forest-800">
          <span className="font-serif text-2xl font-black">404</span>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Page Not Found
          </h2>
          <p className="text-xs text-stone-500">
            The page you are looking for doesn't exist or has moved.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow-md hover:bg-forest-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
