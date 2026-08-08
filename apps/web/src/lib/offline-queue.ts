const QUEUE_KEY = "activity-match-swipe-queue";

interface QueuedSwipe {
  payload: Record<string, unknown>;
  idempotency_key: string;
}

export function queueSwipe(payload: Record<string, unknown>, idempotencyKey: string) {
  const queue = getQueue();
  queue.push({ payload, idempotency_key: idempotencyKey });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedSwipe[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function flushQueue(submit: (item: QueuedSwipe) => Promise<void>) {
  const queue = getQueue();
  const remaining: QueuedSwipe[] = [];
  for (const item of queue) {
    try {
      await submit(item);
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
