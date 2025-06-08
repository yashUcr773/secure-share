/**
 * Background Job Processing System for SecureShare
 * Handles asynchronous tasks like file processing, cleanup, analytics, and notifications
 */

import { EventEmitter } from 'events';

// Job types
export type JobType = 
  | 'file-compression'
  | 'file-cleanup'
  | 'cache-warmup'
  | 'analytics-processing'
  | 'email-notification'
  | 'cdn-purge'
  | 'database-maintenance'
  | 'thumbnail-generation'
  | 'virus-scan'
  | 'file-processing'
  | 'cache-maintenance'
  | 'storage-maintenance';

// Job status
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

// Job priority levels
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

// Base job interface
export interface Job {
  id: string;
  type: JobType;
  data: Record<string, unknown>;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: Record<string, unknown>;
  progress?: number;
  metadata?: Record<string, unknown>;
}

// Job queue configuration
export interface QueueConfig {
  maxConcurrency: number;
  retryDelay: number;
  maxRetries: number;
  processingTimeout: number;
  enableMetrics: boolean;
}

// Queue metrics
export interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughput: number; // jobs per minute
}

// Job processor function
export type JobProcessor = (job: Job) => Promise<Record<string, unknown> | undefined>;

/**
 * In-memory job queue with persistence fallback
 * Handles background task processing with retry logic and metrics
 */
export class JobQueue extends EventEmitter {
  private static instance: JobQueue;
  private jobs: Map<string, Job> = new Map();
  private processors: Map<JobType, JobProcessor> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private metrics: QueueMetrics;
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = {
      maxConcurrency: config.maxConcurrency || 5,
      retryDelay: config.retryDelay || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
      processingTimeout: config.processingTimeout || 300000, // 5 minutes
      enableMetrics: config.enableMetrics !== false,
    };

    this.metrics = {
      totalJobs: 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      throughput: 0,
    };

    // Start processing loop
    this.startProcessing();

    // Setup cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<QueueConfig>): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue(config);
    }
    return JobQueue.instance;
  }

  /**
   * Register a job processor
   */
  registerProcessor(jobType: JobType, processor: JobProcessor): void {
    this.processors.set(jobType, processor);
  }
  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    data: Record<string, unknown>,
    options: {
      priority?: JobPriority;
      delay?: number;
      maxAttempts?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const now = new Date();
    const scheduledAt = options.delay ? new Date(now.getTime() + options.delay) : now;

    const job: Job = {
      id: jobId,
      type,
      data,
      priority: options.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.maxRetries,
      createdAt: now,
      updatedAt: now,
      scheduledAt,
      metadata: options.metadata,
    };

    this.jobs.set(jobId, job);
    this.metrics.totalJobs++;
    this.metrics.pendingJobs++;

    this.emit('job:added', job);
    return jobId;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: JobType): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') {
      return false;
    }

    if (job.status === 'processing') {
      // Cancel processing timeout
      const timeout = this.processingIntervals.get(jobId);
      if (timeout) {
        clearTimeout(timeout);
        this.processingIntervals.delete(jobId);
      }
      this.processing.delete(jobId);
      this.metrics.processingJobs--;
    }

    if (job.status === 'pending') {
      this.metrics.pendingJobs--;
    }

    job.status = 'failed';
    job.error = 'Job cancelled';
    job.updatedAt = new Date();
    this.metrics.failedJobs++;

    this.emit('job:cancelled', job);
    return true;
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    registeredProcessors: JobType[];
  } {
    return {
      totalJobs: this.jobs.size,
      pendingJobs: this.getJobsByStatus('pending').length,
      processingJobs: this.processing.size,
      registeredProcessors: Array.from(this.processors.keys()),
    };
  }

  /**
   * Clear completed and failed jobs older than specified time
   */
  cleanup(olderThanMs: number = 3600000): number { // 1 hour default
    const cutoff = new Date(Date.now() - olderThanMs);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.updatedAt < cutoff
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('queue:cleaned', { cleaned });
    }

    return cleaned;
  }

  /**
   * Pause job processing
   */
  pause(): void {
    this.emit('queue:paused');
  }

  /**
   * Resume job processing
   */
  resume(): void {
    this.emit('queue:resumed');
    this.processNextJobs();
  }

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    setInterval(() => {
      this.processNextJobs();
    }, 1000); // Check every second
  }

  /**
   * Process next available jobs
   */
  private async processNextJobs(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrency) {
      return;
    }

    const availableSlots = this.config.maxConcurrency - this.processing.size;
    const pendingJobs = this.getAvailableJobs(availableSlots);

    for (const job of pendingJobs) {
      this.processJob(job);
    }
  }

  /**
   * Get available jobs sorted by priority and scheduled time
   */
  private getAvailableJobs(limit: number): Job[] {
    const now = new Date();
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };

    return Array.from(this.jobs.values())
      .filter(job => 
        job.status === 'pending' && 
        (!job.scheduledAt || job.scheduledAt <= now) &&
        this.processors.has(job.type)
      )
      .sort((a, b) => {
        // Sort by priority first, then by created time
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      job.status = 'failed';
      job.error = `No processor registered for job type: ${job.type}`;
      job.updatedAt = new Date();
      this.metrics.failedJobs++;
      this.emit('job:failed', job);
      return;
    }

    // Mark as processing
    job.status = 'processing';
    job.attempts++;
    job.updatedAt = new Date();
    this.processing.add(job.id);
    this.metrics.pendingJobs--;
    this.metrics.processingJobs++;

    const startTime = Date.now();
    this.emit('job:processing', job);

    // Set processing timeout
    const timeout = setTimeout(() => {
      this.handleJobTimeout(job);
    }, this.config.processingTimeout);
    this.processingIntervals.set(job.id, timeout);

    try {
      const result = await processor(job);
      
      // Clear timeout
      clearTimeout(timeout);
      this.processingIntervals.delete(job.id);

      // Mark as completed
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.progress = 100;

      this.processing.delete(job.id);
      this.metrics.processingJobs--;
      this.metrics.completedJobs++;

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      this.emit('job:completed', job);

    } catch (error) {
      // Clear timeout
      clearTimeout(timeout);
      this.processingIntervals.delete(job.id);

      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Handle job timeout
   */
  private async handleJobTimeout(job: Job): Promise<void> {
    this.processing.delete(job.id);
    this.metrics.processingJobs--;
    
    const error = new Error(`Job timed out after ${this.config.processingTimeout}ms`);
    await this.handleJobError(job, error);
  }

  /**
   * Handle job processing error
   */
  private async handleJobError(job: Job, error: Error): Promise<void> {
    job.error = error.message;
    job.updatedAt = new Date();

    if (job.attempts < job.maxAttempts) {
      // Retry the job
      job.status = 'retrying';
      job.scheduledAt = new Date(Date.now() + this.config.retryDelay);
      this.metrics.pendingJobs++;
      this.emit('job:retrying', job);
      
      setTimeout(() => {
        if (job.status === 'retrying') {
          job.status = 'pending';
        }
      }, this.config.retryDelay);
    } else {
      // Mark as failed
      job.status = 'failed';
      this.metrics.failedJobs++;
      this.emit('job:failed', job);
    }
  }

  /**
   * Update average processing time metric
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalCompleted = this.metrics.completedJobs;
    if (totalCompleted === 1) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (totalCompleted - 1) + newTime) / totalCompleted;
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Job queue helpers for common tasks
 */
export class JobQueueHelpers {
  /**
   * Add file compression job
   */
  static async addFileCompressionJob(
    fileId: string, 
    fileName: string,
    priority: JobPriority = 'normal'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('file-compression', { fileId, fileName }, { priority });
  }

  /**
   * Add cache warmup job
   */
  static async addCacheWarmupJob(
    cacheKeys: string[],
    priority: JobPriority = 'normal'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('cache-warmup', { cacheKeys }, { priority });
  }

  /**
   * Add cleanup job
   */
  static async addCleanupJob(
    daysOld: number = 30,
    priority: JobPriority = 'low'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('file-cleanup', { daysOld }, { priority });
  }

  /**
   * Add CDN purge job
   */
  static async addCDNPurgeJob(
    paths: string[],
    priority: JobPriority = 'high'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('cdn-purge', { paths }, { priority });
  }

  /**
   * Add email notification job
   */
  static async addEmailNotificationJob(
    to: string,
    subject: string,
    body: string,
    priority: JobPriority = 'normal'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('email-notification', { to, subject, body }, { priority });
  }

  /**
   * Add database maintenance job
   */
  static async addDatabaseMaintenanceJob(
    tasks: string[],
    priority: JobPriority = 'low'
  ): Promise<string> {
    const queue = JobQueue.getInstance();
    return queue.addJob('database-maintenance', { tasks }, { priority });
  }
}

/**
 * Export default instance
 */
export const jobQueue = JobQueue.getInstance();
