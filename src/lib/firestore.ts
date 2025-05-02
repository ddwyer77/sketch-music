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
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generic function to get all documents from a collection
 */
export async function getAllDocuments<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as T[];
}

/**
 * Generic function to get a document by ID
 */
export async function getDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as T;
  }
  
  return null;
}

/**
 * Generic function to add a document to a collection
 */
export async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
}

/**
 * Generic function to update a document
 */
export async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/**
 * Generic function to delete a document
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

/**
 * Generic function to query documents with filters
 */
export async function queryDocuments<T>(
  collectionName: string, 
  conditions: [string, "=="|">"|"<"|">="|"<=", any][], 
  sortField?: string, 
  sortDirection?: 'asc'|'desc',
  limitCount?: number
): Promise<T[]> {
  let q = collection(db, collectionName);
  let queryRef = query(q);
  
  // Add where conditions
  conditions.forEach(condition => {
    queryRef = query(queryRef, where(condition[0], condition[1], condition[2]));
  });
  
  // Add sorting if specified
  if (sortField) {
    queryRef = query(queryRef, orderBy(sortField, sortDirection || 'asc'));
  }
  
  // Add limit if specified
  if (limitCount) {
    queryRef = query(queryRef, limit(limitCount));
  }
  
  const querySnapshot = await getDocs(queryRef);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as T[];
} 