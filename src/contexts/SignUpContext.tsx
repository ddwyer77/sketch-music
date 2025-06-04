"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { userRole } from '@/types/user';

interface SignUpContextType {
  selectedUserType: userRole | null;
  setSelectedUserType: (type: userRole) => void;
  clearSelectedUserType: () => void;
}

const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

export function SignUpProvider({ children }: { children: ReactNode }) {
  const [selectedUserType, setSelectedUserType] = useState<userRole | null>(null);

  const clearSelectedUserType = () => {
    setSelectedUserType(null);
  };

  return (
    <SignUpContext.Provider value={{ selectedUserType, setSelectedUserType, clearSelectedUserType }}>
      {children}
    </SignUpContext.Provider>
  );
}

export function useSignUp() {
  const context = useContext(SignUpContext);
  if (context === undefined) {
    throw new Error('useSignUp must be used within a SignUpProvider');
  }
  return context;
} 