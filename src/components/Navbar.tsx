"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../../public/images/logo.png';

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-sm px-6 py-4">
      <div className="flex justify-between items-center">
        <Link href="/" className="font-bold w-48"><Image src={logo} alt="Logo" /></Link>
        
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