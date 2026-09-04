import { TelecomOrder } from '../types';
import { updateOrderDelivery } from './firestoreService';
import { processHubtelFulfillment } from './apiClient';

export async function retryTelecomOrderDelivery(order: TelecomOrder): Promise<boolean> {
  try {
    await updateOrderDelivery(order.id, {
      deliveryStatus: 'RETRYING',
      deliveryMessage: `Hubtel Auto-Retry Initiated at ${new Date().toLocaleTimeString()}...`,
      agentId: order.agentId,
    });

    const result = await processHubtelFulfillment({
      orderId: order.id,
      customerPhone: order.customerPhone,
      network: order.network,
      productType: order.productType,
      packageName: order.packageName,
      amountGhs: order.amountGhs,
    });

    if (result.success) {
      await updateOrderDelivery(order.id, {
        deliveryStatus: 'DELIVERED',
        deliveryMessage: result.deliveryMessage || `Delivered via Hubtel Node retry. Ref: ${result.hubtelTransactionId}`,
        hubtelTransactionId: result.hubtelTransactionId || order.hubtelTransactionId,
        agentId: order.agentId,
      });
      return true;
    } else {
      await updateOrderDelivery(order.id, {
        deliveryStatus: 'FAILED',
        deliveryMessage: result.error || 'Retry attempt failed to reach carrier switch.',
        agentId: order.agentId,
      });
      return false;
    }
  } catch (err) {
    console.error('Retry error:', err);
    await updateOrderDelivery(order.id, {
      deliveryStatus: 'FAILED',
      deliveryMessage: 'Failed during retry execution.',
      agentId: order.agentId,
    });
    return false;
  }
}
