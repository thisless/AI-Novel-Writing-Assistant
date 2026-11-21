import type {ApiResponse} from "@ai-novel/shared/types/api";
import type {DirectorVersion, NovelDirectorIdentity} from "@ai-novel/shared/types/director/version";
import {apiClient} from "../client";

export async function getDirectorVersions(): Promise<{availableVersions: DirectorVersion[]; defaultVersion: DirectorVersion}> {
  const {data} = await apiClient.get<ApiResponse<{availableVersions: DirectorVersion[]; defaultVersion: DirectorVersion}>>("/novels/director-versions");
  if (!data.success || !data.data) throw new Error(data.error || "Failed to load director version.");
  return data.data;
}

export async function getNovelDirectorVersion(novelId: string): Promise<NovelDirectorIdentity> {
  const {data} = await apiClient.get<ApiResponse<NovelDirectorIdentity>>(`/novels/${encodeURIComponent(novelId)}/director-version`);
  if (!data.success || !data.data) throw new Error(data.error || "Failed to load this book's director settings.");
  return data.data;
}
export async function setNovelDirectorVersion(novelId: string, version: DirectorVersion, expectedEpoch: number): Promise<NovelDirectorIdentity> {
  const {data} = await apiClient.put<ApiResponse<NovelDirectorIdentity>>(`/novels/${encodeURIComponent(novelId)}/director-version`, {version, expectedEpoch});
  if (!data.success || !data.data) throw new Error(data.error || "Failed to save this book's director settings.");
  return data.data;
}
