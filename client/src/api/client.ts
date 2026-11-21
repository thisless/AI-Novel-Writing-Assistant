import axios, { AxiosError } from "axios";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import {shouldToastApiError} from "@/lib/apiErrors";

export interface ApiHttpError extends Error {
  status?: number;
  details?: unknown;
  code?: string;
  requestId?: string;
}

declare module "axios" {
  interface AxiosRequestConfig {
    silentErrorStatuses?: number[];
    errorPresentation?: "toast" | "inline";
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

const AUTO_DISMISS_SERVER_ERROR_TOAST = {
  duration: 4000,
  closeButton: false,
} as const;

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("ai-novel:access-required"));
    const backendError = error.response?.data?.error;
    const backendMessage = error.response?.data?.message;
    const source = error.response?.data as (ApiResponse<unknown> & {sourceRoute?: unknown; sourceActionLabel?: unknown}) | undefined;
    const sourceRoute = typeof source?.sourceRoute === "string" && /^\/(?!\/)/.test(source.sourceRoute) ? source.sourceRoute : null;
    const sourceAction = status === 409 && sourceRoute ? {label: typeof source?.sourceActionLabel === "string" ? source.sourceActionLabel : "Open creation page", onClick: () => window.location.assign(sourceRoute)} : undefined;
    let title = backendError ?? error.message ?? "Request failed.";
    let description = backendMessage && backendMessage !== backendError ? backendMessage : undefined;

    if (!status) {
      title = "Network connection failed. Check your connection and try again.";
      description = undefined;
    } else if (status >= 500) {
      title = backendError ?? "Server error. Please try again later.";
      description = backendMessage && backendMessage !== title ? backendMessage : undefined;
    }

    if (shouldToastApiError(error.config ?? {}, status)) {
      const isGenericServerErrorToast = title === "Server error. Please try again later.";

      if (sourceAction) {
        toast.error(title, {description, action: sourceAction});
      } else if (description) {
        toast.error(
          title,
          isGenericServerErrorToast
            ? {
                description,
                ...AUTO_DISMISS_SERVER_ERROR_TOAST,
              }
            : { description },
        );
      } else {
        toast.error(title, isGenericServerErrorToast ? AUTO_DISMISS_SERVER_ERROR_TOAST : undefined);
      }
    }

    const message = description ? `${title} ${description}` : title;

    const normalizedError = new Error(
      message,
    ) as ApiHttpError;
    normalizedError.status = status;
    normalizedError.details = error.response?.data;
    normalizedError.code = error.response?.data?.code;
    normalizedError.requestId = error.response?.data?.requestId;
    return Promise.reject(normalizedError);
  },
);
