/**
 * Task Scheduler for breaking down heavy main-thread tasks
 * Helps prevent long main-thread blocking by yielding control back to the browser
 */

export interface ScheduledTask {
  id: string;
  priority: 'high' | 'medium' | 'low';
  task: () => Promise<void> | void;
}

class TaskScheduler {
  private taskQueue: ScheduledTask[] = [];
  private isProcessing = false;
  private readonly TASK_TIMEOUT = 5; // 5ms time slice

  /**
   * Schedule a task to run with yielding to prevent blocking
   */
  schedule(task: ScheduledTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const wrappedTask: ScheduledTask = {
        ...task,
        task: async () => {
          try {
            await task.task();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      };

      // Insert task based on priority
      const insertIndex = this.taskQueue.findIndex(t => 
        this.getPriorityWeight(t.priority) < this.getPriorityWeight(task.priority)
      );
      
      if (insertIndex === -1) {
        this.taskQueue.push(wrappedTask);
      } else {
        this.taskQueue.splice(insertIndex, 0, wrappedTask);
      }

      this.processTasks();
    });
  }

  /**
   * Process tasks with time slicing to prevent blocking
   */
  private async processTasks(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const startTime = performance.now();
      
      // Process tasks for up to TASK_TIMEOUT ms
      while (
        this.taskQueue.length > 0 && 
        (performance.now() - startTime) < this.TASK_TIMEOUT
      ) {
        const task = this.taskQueue.shift();
        if (task) {
          await task.task();
        }
      }

      // Yield control back to the browser if there are more tasks
      if (this.taskQueue.length > 0) {
        await this.yieldToMain();
      }
    }

    this.isProcessing = false;
  }

  /**
   * Yield control back to the main thread
   */
  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Get numeric weight for priority sorting
   */
  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.taskQueue = [];
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.taskQueue.length;
  }
}

// Export singleton instance
export const taskScheduler = new TaskScheduler();

/**
 * Utility function to break down heavy operations
 */
export async function processInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void> | void,
  chunkSize: number = 10,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  for (const [chunkIndex, chunk] of chunks.entries()) {
    await taskScheduler.schedule({
      id: `chunk-${chunkIndex}`,
      priority,
      task: async () => {
        for (const [itemIndex, item] of chunk.entries()) {
          await processor(item, chunkIndex * chunkSize + itemIndex);
        }
      }
    });
  }
}

/**
 * Debounced task scheduler for frequent operations
 */
export function createDebouncedScheduler(delay: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null;

  return function scheduleDebounced(task: ScheduledTask): Promise<void> {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        taskScheduler.schedule(task).then(resolve).catch(reject);
      }, delay);
    });
  };
}
