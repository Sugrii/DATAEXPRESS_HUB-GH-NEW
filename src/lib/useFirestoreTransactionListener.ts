import { useEffect, useRef } from 'react';
import { subscribeOrders } from './firestoreService';
import { useToastNotification } from '../context/ToastNotificationContext';
import { TelecomOrder } from '../types';

export function useFirestoreTransactionListener() {
  const { addToast, listenerActive } = useToastNotification();
  const initialLoadDone = useRef(false);
  const knownOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!listenerActive) return;

    const unsubscribe = subscribeOrders((orders: TelecomOrder[]) => {
      if (!initialLoadDone.current) {
        orders.forEach((o) => knownOrderIds.current.add(o.id));
        initialLoadDone.current = true;
        return;
      }

      orders.forEach((order) => {
        if (!knownOrderIds.current.has(order.id)) {
          knownOrderIds.current.add(order.id);
          addToast(
            'success',
            `New Order: ${order.network} ${order.productType}`,
            `GHS ${order.amountGhs.toFixed(2)} for ${order.customerPhone} (${order.packageName})`
          );
        }
      });
    });

    return () => unsubscribe();
  }, [addToast, listenerActive]);
}
