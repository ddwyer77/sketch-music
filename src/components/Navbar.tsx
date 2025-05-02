"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-2xl text-primary">Sketch Music</Link>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="bg-primary hover:bg-primary/90 px-5 text-white hover:cursor-pointer py-2 rounded-md transition-colors"
        >
          Sign In
        </button>
      </div>
    </nav>
  );
}