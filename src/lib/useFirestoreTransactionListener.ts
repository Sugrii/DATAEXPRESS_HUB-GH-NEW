import { useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { TelecomOrder, SubMerchant } from '../types';
import { useToastNotification } from '../context/ToastNotificationContext';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

interface UseRealtimeTransactionsOptions {
  activeAgent?: SubMerchant | null;
  enabled?: boolean;
}

export function useFirestoreTransactionListener(options?: UseRealtimeTransactionsOptions) {
  const { activeAgent, enabled = true } = options || {};
  const { addTransactionToast, setListenerActive } = useToastNotification();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncedOrdersCount, setSyncedOrdersCount] = useState<number>(0);

  // Use refs to track known order IDs to avoid duplicate toasts on snapshot updates
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadCompleteRef = useRef<boolean>(false);
  const activeAgentIdRef = useRef<string | undefined>(activeAgent?.id);
  activeAgentIdRef.current = activeAgent?.id;

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setListenerActive(false);
      return;
    }

    let unsubscribe: Unsubscribe | null = null;
    initialLoadCompleteRef.current = false;
    knownOrderIdsRef.current.clear();

    try {
      // Determine listening path: if agent is selected, we can listen to global orders or agent subcollection
      // Listening to the global 'orders' collection gives us all events with agent attribution
      const ordersPath = 'orders';
      const ordersQuery = query(
        collection(db, ordersPath),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      setIsConnected(true);
      setListenerActive(true);

      unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          setLastSyncTime(new Date().toISOString());

          if (!initialLoadCompleteRef.current) {
            // Initial load: populate cache without triggering toasts
            snapshot.docs.forEach((docSnap) => {
              knownOrderIdsRef.current.add(docSnap.id);
            });
            setSyncedOrdersCount(snapshot.docs.length);
            initialLoadCompleteRef.current = true;
            return;
          }

          // Process subsequent changes
          snapshot.docChanges().forEach((change) => {
            const orderData = change.doc.data() as TelecomOrder;
            const orderId = change.doc.id || orderData.id;

            // Only trigger toast if:
            // 1) It's a new document OR a newly marked DELIVERED status
            // 2) The delivery status is 'DELIVERED'
            // 3) We haven't already toasted this exact order ID
            const isDelivered = orderData.deliveryStatus === 'DELIVERED';
            const isNewOrDeliveredChange = change.type === 'added' || (change.type === 'modified' && isDelivered);

            if (isDelivered && isNewOrDeliveredChange && !knownOrderIdsRef.current.has(orderId)) {
              knownOrderIdsRef.current.add(orderId);

              const currentActiveAgentId = activeAgentIdRef.current;
              const isOrderForCurrentAgent = Boolean(
                currentActiveAgentId && orderData.agentId && orderData.agentId === currentActiveAgentId
              );

              // If agent is active, show celebration for their order or show global alert
              addTransactionToast(orderData, isOrderForCurrentAgent);
              setSyncedOrdersCount((prev) => prev + 1);
            }
          });
        },
        (error) => {
          setIsConnected(false);
          setListenerActive(false);
          handleFirestoreError(error, OperationType.LIST, 'orders');
        }
      );
    } catch (err) {
      setIsConnected(false);
      setListenerActive(false);
      console.warn('Error setting up Firestore real-time transaction listener:', err);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setIsConnected(false);
      setListenerActive(false);
    };
  }, [activeAgent?.id, enabled, addTransactionToast, setListenerActive]);

  return {
    isConnected,
    lastSyncTime,
    syncedOrdersCount,
  };
}
