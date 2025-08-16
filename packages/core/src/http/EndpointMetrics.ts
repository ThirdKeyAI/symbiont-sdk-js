/**
 * EndpointMetrics - Tracks metrics for HTTP endpoints
 * 
 * This class provides comprehensive metrics tracking for individual HTTP endpoints,
 * including request counts, response times, error rates, and performance statistics.
 */

import { EndpointMetrics as IEndpointMetrics } from '@symbiont/types';

export class EndpointMetrics implements IEndpointMetrics {
  public requestCount: number = 0;
  public averageResponseTime: number = 0;
  public errorRate: number = 0;
  public lastAccessed: Date = new Date();
  public statusCodes: Record<number, number> = {};
  public peakRpm: number = 0;
  public activeRequests: number = 0;

  private responseTimes: number[] = [];
  private requestsInWindow: Date[] = [];
  private readonly maxResponseTimeSamples = 1000;
  private readonly rpmWindowMs = 60000; // 1 minute

  /**
   * Records a new request being started
   */
  public startRequest(): void {
    this.activeRequests++;
    this.lastAccessed = new Date();
  }

  /**
   * Records a completed request with response time and status code
   * @param responseTimeMs - Response time in milliseconds
   * @param statusCode - HTTP status code
   */
  public recordResponse(responseTimeMs: number, statusCode: number): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.requestCount++;
    
    // Update response time metrics
    this.responseTimes.push(responseTimeMs);
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }
    this.averageResponseTime = this.calculateAverageResponseTime();
    
    // Update status code metrics
    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
    
    // Update error rate
    this.errorRate = this.calculateErrorRate();
    
    // Add to RPM tracking window
    this.addToRequestWindow();
    
    // Update peak RPM
    this.updatePeakRpm();
  }

  /**
   * Records a request error
   * @param statusCode - HTTP status code (usually 4xx or 5xx)
   */
  public recordError(statusCode: number = 500): void {
    this.recordResponse(0, statusCode);
  }

  /**
   * Resets all metrics to initial state
   */
  public reset(): void {
    this.requestCount = 0;
    this.averageResponseTime = 0;
    this.errorRate = 0;
    this.lastAccessed = new Date();
    this.statusCodes = {};
    this.peakRpm = 0;
    this.activeRequests = 0;
    this.responseTimes = [];
    this.requestsInWindow = [];
  }

  /**
   * Gets current requests per minute
   */
  public getCurrentRpm(): number {
    this.cleanRequestWindow();
    return this.requestsInWindow.length;
  }

  /**
   * Gets metrics summary as a plain object
   */
  public toJSON(): IEndpointMetrics {
    return {
      requestCount: this.requestCount,
      averageResponseTime: this.averageResponseTime,
      errorRate: this.errorRate,
      lastAccessed: this.lastAccessed,
      statusCodes: { ...this.statusCodes },
      peakRpm: this.peakRpm,
      activeRequests: this.activeRequests,
    };
  }

  /**
   * Creates EndpointMetrics from existing metrics data
   */
  public static fromJSON(data: IEndpointMetrics): EndpointMetrics {
    const metrics = new EndpointMetrics();
    metrics.requestCount = data.requestCount;
    metrics.averageResponseTime = data.averageResponseTime;
    metrics.errorRate = data.errorRate;
    metrics.lastAccessed = new Date(data.lastAccessed);
    metrics.statusCodes = { ...data.statusCodes };
    metrics.peakRpm = data.peakRpm;
    metrics.activeRequests = data.activeRequests;
    return metrics;
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round((sum / this.responseTimes.length) * 100) / 100;
  }

  private calculateErrorRate(): number {
    if (this.requestCount === 0) return 0;
    
    const errorCount = Object.entries(this.statusCodes)
      .filter(([code]) => parseInt(code) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    
    return Math.round((errorCount / this.requestCount) * 10000) / 100; // 2 decimal places
  }

  private addToRequestWindow(): void {
    const now = new Date();
    this.requestsInWindow.push(now);
    this.cleanRequestWindow();
  }

  private cleanRequestWindow(): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.rpmWindowMs);
    
    // Remove requests outside the window
    this.requestsInWindow = this.requestsInWindow.filter(
      timestamp => timestamp > windowStart
    );
  }

  private updatePeakRpm(): void {
    // Window is already cleaned by addToRequestWindow()
    const currentRpm = this.requestsInWindow.length;
    this.peakRpm = Math.max(this.peakRpm, currentRpm);
  }
}