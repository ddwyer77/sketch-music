"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userRole } from '@/types/user';

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: userRole[];
  displayName?: string;
};

const RoleBadge = ({ role }: { role: userRole }) => {
  const colors = {
    admin: 'bg-orange-100 text-orange-800',
    creator: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
      {role}
    </span>
  );
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<userRole | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (!userData.roles?.includes('admin')) {
              router.push('/creator');
            }
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setError('Failed to verify admin status');
        }
      }
    };
    checkAdminStatus();
  }, [user, router]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          // For Gmail accounts, try to extract name from email if first_name is not set
          if (data.email?.endsWith('@gmail.com') && !data.first_name) {
            const emailName = data.email.split('@')[0];
            // Convert email name to proper case and handle dots/underscores
            const formattedName = emailName
              .replace(/[._]/g, ' ')
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            return {
              id: doc.id,
              ...data,
              first_name: formattedName,
              last_name: ''
            };
          }
          return {
            id: doc.id,
            ...data
          };
        }) as User[];
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search query and role filter
  useEffect(() => {
    let filtered = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles?.includes(roleFilter as userRole));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.first_name?.toLowerCase() || '').includes(query) ||
        (user.last_name?.toLowerCase() || '').includes(query) ||
        (user.email?.toLowerCase() || '').includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  // Handle role update
  const handleRoleUpdate = async (userId: string, role: userRole, isChecked: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentRoles = userData.roles || [];
        
        // Add or remove the role based on checkbox state
        const updatedRoles = isChecked
          ? [...currentRoles, role]
          : currentRoles.filter((r: userRole) => r !== role);

        await updateDoc(userRef, { roles: updatedRoles });

        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId 
              ? { ...u, roles: updatedRoles }
              : u
          )
        );
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Users</h1>
      
      {/* Filters */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-800"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as userRole | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-800"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="creator">Creator</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <li key={user.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </h2>
                    <div className="flex space-x-1">
                      {user.roles?.map(role => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="flex flex-col space-y-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={user.roles?.includes('admin')}
                        onChange={(e) => handleRoleUpdate(user.id, 'admin', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Admin</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={user.roles?.includes('creator')}
                        onChange={(e) => handleRoleUpdate(user.id, 'creator', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Creator</span>
                    </label>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
