import type { AutoDirectorChannelSettings } from "@/api/settings";

export interface AutoDirectorEventOption {
  code: string;
  label: string;
  description: string;
}

export interface AutoDirectorChannelDraft {
  baseUrl: string;
  feishu: AutoDirectorChannelSettings["feishu"];
  dingtalk: {
    secret: string;
    webhookUrl: string;
    callbackToken: string;
    operatorMapJson: string;
    eventTypes: string[];
  };
  wecom: {
    webhookUrl: string;
    callbackToken: string;
    operatorMapJson: string;
    eventTypes: string[];
  };
}

export const AUTO_DIRECTOR_EVENT_OPTIONS: AutoDirectorEventOption[] = [
  {
    code: "auto_director.approval_required",
    label: "Action needed",
    description: "Notify you when Auto Director pauses at a step that needs your confirmation or input.",
  },
  {
    code: "auto_director.auto_approved",
    label: "AI auto-approved",
    description: "Notify you when the system approves a checkpoint using your authorization and continues.",
  },
  {
    code: "auto_director.exception",
    label: "Execution issue",
    description: "Notify you when Auto Director encounters an error, fails, or enters an abnormal state.",
  },
  {
    code: "auto_director.recovered",
    label: "Execution resumed",
    description: "Notify you when an Auto Director task resumes after an issue.",
  },
  {
    code: "auto_director.completed",
    label: "Execution completed",
    description: "Notify you when an Auto Director task completes its current stage or the entire workflow.",
  },
  {
    code: "auto_director.progress_changed",
    label: "Progress update",
    description: "Notify you when Auto Director moves to another stage or makes a significant progress change.",
  },
];

const AUTO_DIRECTOR_EVENT_LABEL_MAP = new Map(
  AUTO_DIRECTOR_EVENT_OPTIONS.map((item) => [item.code, item.label]),
);

export function buildAutoDirectorChannelDraft(
  settings?: AutoDirectorChannelSettings | null,
): AutoDirectorChannelDraft {
  return settings ? {
    baseUrl: settings.baseUrl,
    feishu: settings.feishu ?? {enabled: false, appId: "", appSecret: "", receiveId: "", receiveIdType: "chat_id", domain: "feishu", operatorMapJson: "", eventTypes: []},
    dingtalk: {
      secret: settings.dingtalk.secret ?? "",
      webhookUrl: settings.dingtalk.webhookUrl,
      callbackToken: settings.dingtalk.callbackToken,
      operatorMapJson: settings.dingtalk.operatorMapJson,
      eventTypes: settings.dingtalk.eventTypes,
    },
    wecom: {
      webhookUrl: settings.wecom.webhookUrl,
      callbackToken: settings.wecom.callbackToken,
      operatorMapJson: settings.wecom.operatorMapJson,
      eventTypes: settings.wecom.eventTypes,
    },
  } : {
    baseUrl: "",
    feishu: {enabled: false, appId: "", appSecret: "", receiveId: "", receiveIdType: "chat_id", domain: "feishu", operatorMapJson: "", eventTypes: []},
    dingtalk: {
      secret: "",
      webhookUrl: "",
      callbackToken: "",
      operatorMapJson: "",
      eventTypes: [],
    },
    wecom: {
      webhookUrl: "",
      callbackToken: "",
      operatorMapJson: "",
      eventTypes: [],
    },
  };
}

export function summarizeSelectedAutoDirectorEvents(codes: string[]): string {
  const labels = codes
    .map((code) => AUTO_DIRECTOR_EVENT_LABEL_MAP.get(code))
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) {
    return "No events subscribed";
  }
  if (labels.length <= 2) {
    return labels.join("、");
  }
  return `${labels.slice(0, 2).join(", ")} and ${labels.length - 2} more`;
}
