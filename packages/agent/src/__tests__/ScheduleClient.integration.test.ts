import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScheduleClient } from '../ScheduleClient';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import {
  mockScheduleSummaries,
  mockScheduleDetail,
  mockCreateScheduleResponse,
  mockScheduleHistory,
  mockNextRuns,
  mockScheduleAction,
  mockDeleteSchedule,
  mockSchedulerHealth,
  mockErrorResponses,
} from '../../../testing/src/data/mockData';
import type {
  CreateScheduleRequest,
  UpdateScheduleRequest,
} from '@symbiont/types';

describe('ScheduleClient Integration Tests', () => {
  let testEnv: TestEnvironment;
  let scheduleClient: ScheduleClient;

  beforeEach(async () => {
    testEnv = new TestEnvironment({
      runtimeApiUrl: 'http://localhost:8080',
      apiKey: 'test-api-key',
    });
    await testEnv.setup();

    const symbiontClient = testEnv.getClient();
    scheduleClient = symbiontClient.schedules;
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('listSchedules', () => {
    it('should successfully list schedules', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 200,
        body: mockScheduleSummaries,
      });

      const result = await scheduleClient.listSchedules();

      expect(result).toEqual(mockScheduleSummaries);
      expect(mocks.fetch.getCallsFor('/schedules')).toHaveLength(1);
    });

    it('should handle empty schedule list', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 200,
        body: [],
      });

      const result = await scheduleClient.listSchedules();

      expect(result).toEqual([]);
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(scheduleClient.listSchedules()).rejects.toThrow(
        'Schedule API request failed: 401'
      );
    });

    it('should handle server error', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(scheduleClient.listSchedules()).rejects.toThrow(
        'Schedule API request failed: 500'
      );
    });
  });

  describe('createSchedule', () => {
    const mockRequest: CreateScheduleRequest = {
      name: 'Daily Report',
      cron_expression: '0 9 * * *',
      agent_name: 'report-agent',
      timezone: 'UTC',
      policy_ids: ['policy-1'],
      one_shot: false,
    };

    it('should successfully create a schedule', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 201,
        body: mockCreateScheduleResponse,
      });

      const result = await scheduleClient.createSchedule(mockRequest);

      expect(result).toEqual(mockCreateScheduleResponse);

      const calls = mocks.fetch.getCallsFor('/schedules');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual(mockRequest);
    });

    it('should handle validation errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/schedules', {
        status: 400,
        body: mockErrorResponses.validationError,
      });

      await expect(scheduleClient.createSchedule(mockRequest)).rejects.toThrow(
        'Schedule API request failed: 400'
      );
    });
  });

  describe('getSchedule', () => {
    const jobId = 'job-1';

    it('should successfully get schedule details', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}`, {
        status: 200,
        body: mockScheduleDetail,
      });

      const result = await scheduleClient.getSchedule(jobId);

      expect(result).toEqual(mockScheduleDetail);
      expect(mocks.fetch.getCallsFor(`/schedules/${jobId}`)).toHaveLength(1);
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.getSchedule('')).rejects.toThrow(
        'Job ID is required'
      );
    });

    it('should handle schedule not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(scheduleClient.getSchedule(jobId)).rejects.toThrow(
        'Schedule API request failed: 404'
      );
    });
  });

  describe('updateSchedule', () => {
    const jobId = 'job-1';
    const mockUpdate: UpdateScheduleRequest = {
      cron_expression: '0 10 * * *',
      timezone: 'America/New_York',
    };

    it('should successfully update a schedule', async () => {
      const mocks = testEnv.getMocks();
      const updatedDetail = { ...mockScheduleDetail, cron_expression: '0 10 * * *' };
      mocks.fetch.mockResponse(`/schedules/${jobId}`, {
        status: 200,
        body: updatedDetail,
      });

      const result = await scheduleClient.updateSchedule(jobId, mockUpdate);

      expect(result).toEqual(updatedDetail);

      const calls = mocks.fetch.getCallsFor(`/schedules/${jobId}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('PUT');
      expect(JSON.parse(calls[0].body!)).toEqual(mockUpdate);
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.updateSchedule('', mockUpdate)).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('deleteSchedule', () => {
    const jobId = 'job-1';

    it('should successfully delete a schedule', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}`, {
        status: 200,
        body: mockDeleteSchedule,
      });

      const result = await scheduleClient.deleteSchedule(jobId);

      // DELETE returns undefined from makeRequest
      expect(result).toBeUndefined();
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.deleteSchedule('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('pauseSchedule', () => {
    const jobId = 'job-1';

    it('should successfully pause a schedule', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/pause`, {
        status: 200,
        body: { ...mockScheduleAction, action: 'pause' },
      });

      const result = await scheduleClient.pauseSchedule(jobId);

      expect(result.job_id).toBe('job-1');
      expect(result.action).toBe('pause');
      expect(mocks.fetch.getCallsFor(`/schedules/${jobId}/pause`)).toHaveLength(1);
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.pauseSchedule('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('resumeSchedule', () => {
    const jobId = 'job-1';

    it('should successfully resume a schedule', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/resume`, {
        status: 200,
        body: { ...mockScheduleAction, action: 'resume' },
      });

      const result = await scheduleClient.resumeSchedule(jobId);

      expect(result.job_id).toBe('job-1');
      expect(result.action).toBe('resume');
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.resumeSchedule('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('triggerSchedule', () => {
    const jobId = 'job-1';

    it('should successfully trigger a schedule', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/trigger`, {
        status: 200,
        body: { ...mockScheduleAction, action: 'trigger' },
      });

      const result = await scheduleClient.triggerSchedule(jobId);

      expect(result.job_id).toBe('job-1');
      expect(result.action).toBe('trigger');
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.triggerSchedule('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('getScheduleHistory', () => {
    const jobId = 'job-1';

    it('should successfully get schedule history', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/history?limit=50`, {
        status: 200,
        body: mockScheduleHistory,
      });

      const result = await scheduleClient.getScheduleHistory(jobId);

      expect(result).toEqual(mockScheduleHistory);
      expect(result.history).toHaveLength(2);
    });

    it('should support custom limit', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/history?limit=10`, {
        status: 200,
        body: mockScheduleHistory,
      });

      const result = await scheduleClient.getScheduleHistory(jobId, 10);

      expect(result).toEqual(mockScheduleHistory);
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.getScheduleHistory('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('getScheduleNextRuns', () => {
    const jobId = 'job-1';

    it('should successfully get next runs', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/next-runs?count=10`, {
        status: 200,
        body: mockNextRuns,
      });

      const result = await scheduleClient.getScheduleNextRuns(jobId);

      expect(result).toEqual(mockNextRuns);
      expect(result.next_runs).toHaveLength(3);
    });

    it('should support custom count', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/schedules/${jobId}/next-runs?count=5`, {
        status: 200,
        body: mockNextRuns,
      });

      const result = await scheduleClient.getScheduleNextRuns(jobId, 5);

      expect(result).toEqual(mockNextRuns);
    });

    it('should throw error for empty job ID', async () => {
      await expect(scheduleClient.getScheduleNextRuns('')).rejects.toThrow(
        'Job ID is required'
      );
    });
  });

  describe('getSchedulerHealth', () => {
    it('should successfully get scheduler health', async () => {
      const mocks = testEnv.getMocks();
      // Override /health to not interfere, then set /health/scheduler
      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: mockSchedulerHealth,
      });
      mocks.fetch.mockResponse('/health/scheduler', {
        status: 200,
        body: mockSchedulerHealth,
      });

      const result = await scheduleClient.getSchedulerHealth();

      expect(result).toEqual(mockSchedulerHealth);
      expect(result.is_running).toBe(true);
      expect(result.jobs_total).toBe(5);
      expect(mocks.fetch.getCallsFor('/health/scheduler')).toHaveLength(1);
    });

    it('should handle server error', async () => {
      const mocks = testEnv.getMocks();
      // Override /health to return error too, since it matches first via includes()
      mocks.fetch.mockResponse('/health', {
        status: 500,
        body: mockErrorResponses.serverError,
      });
      mocks.fetch.mockResponse('/health/scheduler', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(scheduleClient.getSchedulerHealth()).rejects.toThrow(
        'Schedule API request failed: 500'
      );
    });
  });
});
