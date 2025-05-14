"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { UserType } from '@/types/user';

interface SignUpContextType {
  selectedUserType: UserType | null;
  setSelectedUserType: (type: UserType) => void;
  clearSelectedUserType: () => void;
}

const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

export function SignUpProvider({ children }: { children: ReactNode }) {
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);

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