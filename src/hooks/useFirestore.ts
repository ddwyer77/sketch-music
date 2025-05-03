import { useState, useEffect } from 'react';
import { 
  collection, 
  doc,
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Generic type for Firestore data
export type FirestoreDocument<T> = T & { id: string };

// Hook for getting all documents from a collection
export const useCollection = <T>(collectionName: string) => {
  const [documents, setDocuments] = useState<FirestoreDocument<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreDocument<T>[];
      
      setDocuments(docs);
      setError(null);
    } catch (err) {
      console.error('Error fetching collection:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching collection'));
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger a refresh by incrementing the counter
  const refresh = async () => {
    setRefreshCounter(prev => prev + 1);
    await fetchDocuments();
  };

  useEffect(() => {
    fetchDocuments();
  }, [collectionName, refreshCounter]);

  return { documents, loading, error, refresh };
};

// Hook for getting a single document from a collection
export const useDocument = <T>(collectionName: string, documentId: string | null) => {
  const [document, setDocument] = useState<FirestoreDocument<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        setDocument(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDocument({
            id: docSnap.id,
            ...docSnap.data()
          } as FirestoreDocument<T>);
          setError(null);
        } else {
          setDocument(null);
          setError(new Error(`Document ${documentId} does not exist`));
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching document'));
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [collectionName, documentId]);

  return { document, loading, error };
};

// Hook for querying documents with filters
export const useQuery = <T>(
  collectionName: string, 
  constraints: QueryConstraint[] = []
) => {
  const [documents, setDocuments] = useState<FirestoreDocument<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuery = async () => {
    setLoading(true);
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreDocument<T>[];
      
      setDocuments(docs);
      setError(null);
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err instanceof Error ? err : new Error('Unknown error executing query'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuery();
  }, [collectionName, JSON.stringify(constraints)]);

  return { documents, loading, error, refresh: fetchQuery };
};

// CRUD Operations
export const useFirestoreOperations = <T>(collectionName: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state for next operation
  const resetState = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  // Add document
  const addDocument = async (data: T): Promise<string | null> => {
    resetState();
    setLoading(true);
    
    try {
      const docRef = await addDoc(collection(db, collectionName), data as DocumentData);
      setSuccess(true);
      return docRef.id;
    } catch (err) {
      console.error('Error adding document:', err);
      setError(err instanceof Error ? err : new Error('Unknown error adding document'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update document
  const updateDocument = async (id: string, data: Partial<T>): Promise<boolean> => {
    resetState();
    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data as DocumentData);
      setSuccess(true);
      return true;
    } catch (err) {
      console.error('Error updating document:', err);
      setError(err instanceof Error ? err : new Error('Unknown error updating document'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const deleteDocument = async (id: string): Promise<boolean> => {
    resetState();
    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      setSuccess(true);
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err instanceof Error ? err : new Error('Unknown error deleting document'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { 
    addDocument, 
    updateDocument, 
    deleteDocument, 
    loading, 
    error, 
    success,
    resetState
  };
};

// Helper function for creating constraints
export const createConstraints = {
  filter: (field: string, operator: string, value: any) => where(field, operator as any, value),
  sort: (field: string, direction: 'asc' | 'desc' = 'asc') => orderBy(field, direction),
  limitTo: (limitCount: number) => limit(limitCount)
}; 