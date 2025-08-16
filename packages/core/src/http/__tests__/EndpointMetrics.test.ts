import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EndpointMetrics } from '../EndpointMetrics';

describe('EndpointMetrics', () => {
  let metrics: EndpointMetrics;

  beforeEach(() => {
    metrics = new EndpointMetrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const newMetrics = new EndpointMetrics();

      expect(newMetrics.requestCount).toBe(0);
      expect(newMetrics.averageResponseTime).toBe(0);
      expect(newMetrics.errorRate).toBe(0);
      expect(newMetrics.lastAccessed).toBeInstanceOf(Date);
      expect(newMetrics.statusCodes).toEqual({});
      expect(newMetrics.peakRpm).toBe(0);
      expect(newMetrics.activeRequests).toBe(0);
    });
  });

  describe('startRequest', () => {
    it('should increment active requests counter', () => {
      expect(metrics.activeRequests).toBe(0);

      metrics.startRequest();
      expect(metrics.activeRequests).toBe(1);

      metrics.startRequest();
      expect(metrics.activeRequests).toBe(2);
    });

    it('should update last accessed timestamp', () => {
      const initialTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(initialTime);

      const newMetrics = new EndpointMetrics();
      expect(newMetrics.lastAccessed).toEqual(initialTime);

      const laterTime = new Date('2023-01-01T01:00:00Z');
      vi.setSystemTime(laterTime);

      newMetrics.startRequest();
      expect(newMetrics.lastAccessed).toEqual(laterTime);
    });
  });

  describe('recordResponse', () => {
    it('should record successful response', () => {
      metrics.startRequest();
      metrics.recordResponse(150, 200);

      expect(metrics.activeRequests).toBe(0);
      expect(metrics.requestCount).toBe(1);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.statusCodes[200]).toBe(1);
      expect(metrics.errorRate).toBe(0);
    });

    it('should handle multiple responses and calculate average', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);

      metrics.startRequest();
      metrics.recordResponse(200, 200);

      expect(metrics.requestCount).toBe(2);
      expect(metrics.averageResponseTime).toBe(150); // (100 + 200) / 2
      expect(metrics.statusCodes[200]).toBe(2);
    });

    it('should calculate error rate correctly', () => {
      // Record successful responses
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(120, 200);

      // Record error responses
      metrics.startRequest();
      metrics.recordResponse(50, 404);
      metrics.startRequest();
      metrics.recordResponse(30, 500);

      expect(metrics.requestCount).toBe(4);
      expect(metrics.errorRate).toBe(50); // 2 errors out of 4 requests = 50%
    });

    it('should track different status codes', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(120, 201);
      metrics.startRequest();
      metrics.recordResponse(50, 404);
      metrics.startRequest();
      metrics.recordResponse(30, 500);

      expect(metrics.statusCodes[200]).toBe(1);
      expect(metrics.statusCodes[201]).toBe(1);
      expect(metrics.statusCodes[404]).toBe(1);
      expect(metrics.statusCodes[500]).toBe(1);
    });

    it('should prevent active requests from going negative', () => {
      // Record response without starting request
      metrics.recordResponse(100, 200);

      expect(metrics.activeRequests).toBe(0);
    });

    it('should update peak RPM', () => {
      const baseTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // Make multiple requests quickly
      for (let i = 0; i < 5; i++) {
        metrics.startRequest();
        metrics.recordResponse(100, 200);
      }

      expect(metrics.peakRpm).toBe(5);

      // Add more requests
      for (let i = 0; i < 3; i++) {
        metrics.startRequest();
        metrics.recordResponse(100, 200);
      }

      expect(metrics.peakRpm).toBe(8);
    });

    it('should limit response time samples', () => {
      // Record more than max samples (1000)
      for (let i = 0; i < 1200; i++) {
        metrics.startRequest();
        metrics.recordResponse(i, 200);
      }

      expect(metrics.requestCount).toBe(1200);
      // Average should be calculated from only the last 1000 samples
      // Last 1000 samples: 200-1199, average = (200+1199)/2 = 699.5
      expect(metrics.averageResponseTime).toBeCloseTo(699.5, 0);
    });
  });

  describe('recordError', () => {
    it('should record error with default status code 500', () => {
      metrics.recordError();

      expect(metrics.requestCount).toBe(1);
      expect(metrics.statusCodes[500]).toBe(1);
      expect(metrics.errorRate).toBe(100);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should record error with custom status code', () => {
      metrics.recordError(404);

      expect(metrics.requestCount).toBe(1);
      expect(metrics.statusCodes[404]).toBe(1);
      expect(metrics.errorRate).toBe(100);
    });

    it('should affect error rate calculation', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.recordError(500);

      expect(metrics.requestCount).toBe(2);
      expect(metrics.errorRate).toBe(50); // 1 error out of 2 requests
    });
  });

  describe('reset', () => {
    it('should reset all metrics to initial state', () => {
      // Setup some metrics
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.recordError(500);

      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThan(0);

      metrics.reset();

      expect(metrics.requestCount).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.statusCodes).toEqual({});
      expect(metrics.peakRpm).toBe(0);
      expect(metrics.activeRequests).toBe(0);
      expect(metrics.lastAccessed).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentRpm', () => {
    it('should return current requests per minute', () => {
      const baseTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      expect(metrics.getCurrentRpm()).toBe(0);

      // Add some requests
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(120, 200);

      expect(metrics.getCurrentRpm()).toBe(2);
    });

    it('should exclude requests outside time window', () => {
      const baseTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // Add requests at base time
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(120, 200);

      expect(metrics.getCurrentRpm()).toBe(2);

      // Move time forward beyond window (61 seconds)
      vi.setSystemTime(new Date(baseTime.getTime() + 61000));

      // Old requests should be excluded
      expect(metrics.getCurrentRpm()).toBe(0);

      // Add new request
      metrics.startRequest();
      metrics.recordResponse(100, 200);

      expect(metrics.getCurrentRpm()).toBe(1);
    });
  });

  describe('toJSON', () => {
    it('should return metrics as plain object', () => {
      const baseTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      metrics.startRequest();
      metrics.recordResponse(150, 200);
      metrics.recordError(500);

      const json = metrics.toJSON();

      expect(json).toEqual({
        requestCount: 2,
        averageResponseTime: 75, // (150 + 0) / 2
        errorRate: 50,
        lastAccessed: expect.any(Date),
        statusCodes: { 200: 1, 500: 1 },
        peakRpm: 2,
        activeRequests: 0,
      });
    });

    it('should create a copy of status codes object', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);

      const json = metrics.toJSON();

      // Modify the returned object
      json.statusCodes[201] = 5;

      // Original should be unchanged
      expect(metrics.statusCodes[201]).toBeUndefined();
    });
  });

  describe('fromJSON', () => {
    it('should create EndpointMetrics from JSON data', () => {
      const jsonData = {
        requestCount: 10,
        averageResponseTime: 125.5,
        errorRate: 20,
        lastAccessed: new Date('2023-01-01T12:00:00Z'),
        statusCodes: { 200: 8, 404: 1, 500: 1 },
        peakRpm: 15,
        activeRequests: 2,
      };

      const restoredMetrics = EndpointMetrics.fromJSON(jsonData);

      expect(restoredMetrics.requestCount).toBe(10);
      expect(restoredMetrics.averageResponseTime).toBe(125.5);
      expect(restoredMetrics.errorRate).toBe(20);
      expect(restoredMetrics.lastAccessed).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(restoredMetrics.statusCodes).toEqual({ 200: 8, 404: 1, 500: 1 });
      expect(restoredMetrics.peakRpm).toBe(15);
      expect(restoredMetrics.activeRequests).toBe(2);
    });

    it('should handle date string conversion', () => {
      const jsonData = {
        requestCount: 5,
        averageResponseTime: 100,
        errorRate: 0,
        lastAccessed: '2023-01-01T12:00:00Z',
        statusCodes: {},
        peakRpm: 0,
        activeRequests: 0,
      };

      const restoredMetrics = EndpointMetrics.fromJSON(jsonData as any);

      expect(restoredMetrics.lastAccessed).toBeInstanceOf(Date);
      expect(restoredMetrics.lastAccessed).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should create a copy of status codes', () => {
      const statusCodes = { 200: 5, 404: 2 };
      const jsonData = {
        requestCount: 7,
        averageResponseTime: 100,
        errorRate: 28.57,
        lastAccessed: new Date(),
        statusCodes,
        peakRpm: 10,
        activeRequests: 0,
      };

      const restoredMetrics = EndpointMetrics.fromJSON(jsonData);

      // Modify original object
      statusCodes[500] = 3;

      // Restored metrics should not be affected
      expect(restoredMetrics.statusCodes[500]).toBeUndefined();
    });
  });

  describe('error rate calculation edge cases', () => {
    it('should return 0 error rate when no requests', () => {
      expect(metrics.errorRate).toBe(0);
    });

    it('should handle client errors (4xx) as errors', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(50, 400);
      metrics.startRequest();
      metrics.recordResponse(30, 404);

      expect(metrics.errorRate).toBeCloseTo(66.67, 1); // 2 errors out of 3
    });

    it('should handle server errors (5xx) as errors', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(50, 500);
      metrics.startRequest();
      metrics.recordResponse(30, 503);

      expect(metrics.errorRate).toBeCloseTo(66.67, 1); // 2 errors out of 3
    });

    it('should not count 3xx as errors', () => {
      metrics.startRequest();
      metrics.recordResponse(100, 200);
      metrics.startRequest();
      metrics.recordResponse(50, 301);
      metrics.startRequest();
      metrics.recordResponse(30, 302);

      expect(metrics.errorRate).toBe(0); // No errors
    });
  });

  describe('response time calculation', () => {
    it('should return 0 average when no response times recorded', () => {
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should round average response time to 2 decimal places', () => {
      metrics.startRequest();
      metrics.recordResponse(100.333, 200);
      metrics.startRequest();
      metrics.recordResponse(200.666, 200);

      expect(metrics.averageResponseTime).toBe(150.5); // Rounded to 2 decimal places
    });
  });

  describe('peak RPM tracking', () => {
    it('should track peak RPM over time', () => {
      const baseTime = new Date('2023-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // First burst of requests
      for (let i = 0; i < 3; i++) {
        metrics.startRequest();
        metrics.recordResponse(100, 200);
      }
      expect(metrics.peakRpm).toBe(3);

      // Second larger burst
      for (let i = 0; i < 7; i++) {
        metrics.startRequest();
        metrics.recordResponse(100, 200);
      }
      expect(metrics.peakRpm).toBe(10); // 3 + 7

      // Move time forward and add fewer requests
      vi.setSystemTime(new Date(baseTime.getTime() + 30000)); // 30 seconds later
      for (let i = 0; i < 2; i++) {
        metrics.startRequest();
        metrics.recordResponse(100, 200);
      }

      // Peak should now be higher since all requests are still in the 1-minute window
      expect(metrics.peakRpm).toBe(12); // 10 previous + 2 new = 12 total in window
    });
  });
});