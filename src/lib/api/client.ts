import { postJson } from '@/lib/util/http';
import type {
  AvatarRequest,
  AvatarResponse,
  EditRequest,
  EditResponse,
  TryOnRequest,
  TryOnResponse,
  AmazonSearchRequest,
  AmazonSearchResponse,
  VideoRequest,
  VideoResponse,
} from './types';

export const api = {
  avatar: (body: AvatarRequest) => postJson<AvatarRequest, AvatarResponse>('/api/avatar', body),
  edit: (body: EditRequest) => postJson<EditRequest, EditResponse>('/api/edit', body),
  tryon: (body: TryOnRequest) => postJson<TryOnRequest, TryOnResponse>('/api/tryon', body),
  amazon: (body: AmazonSearchRequest) => postJson<AmazonSearchRequest, AmazonSearchResponse>('/api/amazon', body),
  video: (body: VideoRequest) => postJson<VideoRequest, VideoResponse>('/api/video', body),
};


