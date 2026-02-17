import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChannelClient } from '../ChannelClient';
import { TestEnvironment } from '../../../testing/src/TestEnvironment';
import {
  mockChannelSummaries,
  mockChannelDetail,
  mockRegisterChannelResponse,
  mockChannelAction,
  mockDeleteChannel,
  mockChannelHealth,
  mockIdentityMappings,
  mockChannelAudit,
  mockErrorResponses,
} from '../../../testing/src/data/mockData';
import type {
  RegisterChannelRequest,
  UpdateChannelRequest,
  AddIdentityMappingRequest,
} from '@symbi/types';

describe('ChannelClient Integration Tests', () => {
  let testEnv: TestEnvironment;
  let channelClient: ChannelClient;

  beforeEach(async () => {
    testEnv = new TestEnvironment({
      runtimeApiUrl: 'http://localhost:8080',
      apiKey: 'test-api-key',
    });
    await testEnv.setup();

    const symbiontClient = testEnv.getClient();
    channelClient = symbiontClient.channels;
  });

  afterEach(async () => {
    await testEnv.teardown();
  });

  describe('listChannels', () => {
    it('should successfully list channels', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 200,
        body: mockChannelSummaries,
      });

      const result = await channelClient.listChannels();

      expect(result).toEqual(mockChannelSummaries);
      expect(mocks.fetch.getCallsFor('/channels')).toHaveLength(1);
    });

    it('should handle empty channel list', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 200,
        body: [],
      });

      const result = await channelClient.listChannels();

      expect(result).toEqual([]);
    });

    it('should handle authentication failure', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 401,
        body: mockErrorResponses.unauthorized,
      });

      await expect(channelClient.listChannels()).rejects.toThrow(
        'Channel API request failed: 401'
      );
    });

    it('should handle server error', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(channelClient.listChannels()).rejects.toThrow(
        'Channel API request failed: 500'
      );
    });
  });

  describe('registerChannel', () => {
    const mockRequest: RegisterChannelRequest = {
      name: 'eng-teams',
      platform: 'teams',
      config: { tenant_id: 'abc-123' },
    };

    it('should successfully register a channel', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 201,
        body: mockRegisterChannelResponse,
      });

      const result = await channelClient.registerChannel(mockRequest);

      expect(result).toEqual(mockRegisterChannelResponse);

      const calls = mocks.fetch.getCallsFor('/channels');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(JSON.parse(calls[0].body!)).toEqual(mockRequest);
    });

    it('should handle validation errors', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse('/channels', {
        status: 400,
        body: mockErrorResponses.validationError,
      });

      await expect(channelClient.registerChannel(mockRequest)).rejects.toThrow(
        'Channel API request failed: 400'
      );
    });
  });

  describe('getChannel', () => {
    const channelId = 'ch-1';

    it('should successfully get channel details', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}`, {
        status: 200,
        body: mockChannelDetail,
      });

      const result = await channelClient.getChannel(channelId);

      expect(result).toEqual(mockChannelDetail);
      expect(mocks.fetch.getCallsFor(`/channels/${channelId}`)).toHaveLength(1);
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.getChannel('')).rejects.toThrow(
        'Channel ID is required'
      );
    });

    it('should handle channel not found', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}`, {
        status: 404,
        body: mockErrorResponses.notFound,
      });

      await expect(channelClient.getChannel(channelId)).rejects.toThrow(
        'Channel API request failed: 404'
      );
    });
  });

  describe('updateChannel', () => {
    const channelId = 'ch-1';
    const mockUpdate: UpdateChannelRequest = {
      config: { bot_token: 'xoxb-new' },
    };

    it('should successfully update a channel', async () => {
      const mocks = testEnv.getMocks();
      const updatedDetail = { ...mockChannelDetail, config: { bot_token: 'xoxb-new' } };
      mocks.fetch.mockResponse(`/channels/${channelId}`, {
        status: 200,
        body: updatedDetail,
      });

      const result = await channelClient.updateChannel(channelId, mockUpdate);

      expect(result).toEqual(updatedDetail);

      const calls = mocks.fetch.getCallsFor(`/channels/${channelId}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('PUT');
      expect(JSON.parse(calls[0].body!)).toEqual(mockUpdate);
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.updateChannel('', mockUpdate)).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('deleteChannel', () => {
    const channelId = 'ch-1';

    it('should successfully delete a channel', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}`, {
        status: 200,
        body: mockDeleteChannel,
      });

      const result = await channelClient.deleteChannel(channelId);

      expect(result).toBeUndefined();
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.deleteChannel('')).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('startChannel', () => {
    const channelId = 'ch-1';

    it('should successfully start a channel', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/start`, {
        status: 200,
        body: { ...mockChannelAction, action: 'start' },
      });

      const result = await channelClient.startChannel(channelId);

      expect(result.id).toBe('ch-1');
      expect(result.action).toBe('start');
      expect(mocks.fetch.getCallsFor(`/channels/${channelId}/start`)).toHaveLength(1);
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.startChannel('')).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('stopChannel', () => {
    const channelId = 'ch-1';

    it('should successfully stop a channel', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/stop`, {
        status: 200,
        body: { ...mockChannelAction, action: 'stop', status: 'stopped' },
      });

      const result = await channelClient.stopChannel(channelId);

      expect(result.id).toBe('ch-1');
      expect(result.action).toBe('stop');
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.stopChannel('')).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('getChannelHealth', () => {
    const channelId = 'ch-1';

    it('should successfully get channel health', async () => {
      const mocks = testEnv.getMocks();
      // Override /health too, since it matches via includes()
      mocks.fetch.mockResponse('/health', {
        status: 200,
        body: mockChannelHealth,
      });
      mocks.fetch.mockResponse(`/channels/${channelId}/health`, {
        status: 200,
        body: mockChannelHealth,
      });

      const result = await channelClient.getChannelHealth(channelId);

      expect(result).toEqual(mockChannelHealth);
      expect(result.connected).toBe(true);
      expect(result.workspace_name).toBe('Acme Corp');
      expect(result.channels_active).toBe(5);
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.getChannelHealth('')).rejects.toThrow(
        'Channel ID is required'
      );
    });

    it('should handle server error', async () => {
      const mocks = testEnv.getMocks();
      // Override /health too, since it matches via includes()
      mocks.fetch.mockResponse('/health', {
        status: 500,
        body: mockErrorResponses.serverError,
      });
      mocks.fetch.mockResponse(`/channels/${channelId}/health`, {
        status: 500,
        body: mockErrorResponses.serverError,
      });

      await expect(channelClient.getChannelHealth(channelId)).rejects.toThrow(
        'Channel API request failed: 500'
      );
    });
  });

  describe('listMappings', () => {
    const channelId = 'ch-1';

    it('should successfully list identity mappings', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/mappings`, {
        status: 200,
        body: mockIdentityMappings,
      });

      const result = await channelClient.listMappings(channelId);

      expect(result).toEqual(mockIdentityMappings);
      expect(result).toHaveLength(1);
      expect(result[0].platform_user_id).toBe('U123');
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.listMappings('')).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('addMapping', () => {
    const channelId = 'ch-1';
    const mockRequest: AddIdentityMappingRequest = {
      platform_user_id: 'U456',
      symbiont_user_id: 'bob@acme.com',
      display_name: 'Bob',
      roles: ['user'],
      email: 'bob@acme.com',
    };

    it('should successfully add an identity mapping', async () => {
      const mocks = testEnv.getMocks();
      const mockResult = {
        platform_user_id: 'U456',
        platform: 'slack',
        symbiont_user_id: 'bob@acme.com',
        email: 'bob@acme.com',
        display_name: 'Bob',
        roles: ['user'],
        verified: false,
        created_at: '2024-01-02T00:00:00Z',
      };
      mocks.fetch.mockResponse(`/channels/${channelId}/mappings`, {
        status: 201,
        body: mockResult,
      });

      const result = await channelClient.addMapping(channelId, mockRequest);

      expect(result).toEqual(mockResult);
      expect(result.symbiont_user_id).toBe('bob@acme.com');

      const calls = mocks.fetch.getCallsFor(`/channels/${channelId}/mappings`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.addMapping('', mockRequest)).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });

  describe('removeMapping', () => {
    const channelId = 'ch-1';
    const userId = 'U123';

    it('should successfully remove an identity mapping', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/mappings/${userId}`, {
        status: 200,
        body: {},
      });

      await channelClient.removeMapping(channelId, userId);

      const calls = mocks.fetch.getCallsFor(`/channels/${channelId}/mappings/${userId}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('DELETE');
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.removeMapping('', userId)).rejects.toThrow(
        'Channel ID is required'
      );
    });

    it('should throw error for empty user ID', async () => {
      await expect(channelClient.removeMapping(channelId, '')).rejects.toThrow(
        'User ID is required'
      );
    });
  });

  describe('queryAudit', () => {
    const channelId = 'ch-1';

    it('should successfully query audit log', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/audit`, {
        status: 200,
        body: mockChannelAudit,
      });

      const result = await channelClient.queryAudit(channelId);

      expect(result).toEqual(mockChannelAudit);
      expect(result.channel_id).toBe('ch-1');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].event_type).toBe('message_received');
    });

    it('should support custom limit', async () => {
      const mocks = testEnv.getMocks();
      mocks.fetch.mockResponse(`/channels/${channelId}/audit`, {
        status: 200,
        body: mockChannelAudit,
      });

      const result = await channelClient.queryAudit(channelId, 10);

      expect(result).toEqual(mockChannelAudit);
    });

    it('should throw error for empty channel ID', async () => {
      await expect(channelClient.queryAudit('')).rejects.toThrow(
        'Channel ID is required'
      );
    });
  });
});
