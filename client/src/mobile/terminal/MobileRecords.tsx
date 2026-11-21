import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listTasks } from "@/api/tasks";
import { listAutoDirectorFollowUps } from "@/api/autoDirectorFollowUps";
import { Button } from "@/components/ui/button";
import type { UnifiedTaskSummary } from "@ai-novel/shared/types/task";
import { getNovelEditHref } from "@/lib/novelRoutes";
import { formatStatus, getTaskQueueLevelLabel } from "@/pages/tasks/taskCenterUtils";

function formatMobileTaskStatus(task: UnifiedTaskSummary): string {
  const queueLabel = getTaskQueueLevelLabel(task);
  return queueLabel === "普通任务" ? formatStatus(task.status) : queueLabel;
}

export function MobileRecords() {
  const [cursor, setCursor] = useState<string>();
  const query = useQuery({ queryKey: ["mobileRecords", cursor], queryFn: () => listTasks({ limit: 30, cursor }), refetchInterval: 5000 });
  const data = query.data?.data;
  return <section className="space-y-4"><h1 className="text-xl font-semibold">Activity</h1>
    <p className="text-sm text-muted-foreground">Check task status and open the relevant novel or source page to manage tasks.</p>
    {query.isError ? <p role="alert">Could not load activity. <Button variant="ghost" onClick={() => void query.refetch()}>Try again</Button></p> : null}
    <div className="divide-y">{data?.items.map(task => <article key={`${task.kind}:${task.id}`} className="space-y-2 py-4">
      <h2 className="font-medium">{task.title}</h2><p className="text-sm">{formatMobileTaskStatus(task)} · {Math.round(task.progress <= 1 ? task.progress * 100 : task.progress)}%</p>
      <p className="text-sm text-muted-foreground">{task.currentItemLabel ?? task.currentStage}</p>
      {task.lastError ? <p className="text-sm text-destructive">{task.lastError}</p> : null}
      <Button asChild variant="outline" size="sm"><Link to={task.sourceRoute}>Open source page</Link></Button>
    </article>)}</div>
    {data && !data.items.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
    {data?.nextCursor ? <Button variant="outline" onClick={() => setCursor(data.nextCursor!)}>Next page</Button> : null}
    {cursor ? <Button variant="ghost" onClick={() => setCursor(undefined)}>Back to latest</Button> : null}
  </section>;
}

export function MobileNotifications() {
  const query = useQuery({ queryKey: ["mobileNotifications"], queryFn: () => listAutoDirectorFollowUps({ page: 1, pageSize: 50 }), refetchInterval: 10000 });
  return <section className="space-y-4"><h1 className="text-xl font-semibold">Notifications & follow-ups</h1>
    {query.isError ? <p role="alert">Could not load notifications. <Button variant="ghost" onClick={() => void query.refetch()}>Try again</Button></p> : null}
    <div className="divide-y">{query.data?.data?.items.map(item => <article className="space-y-2 py-4" key={`${item.itemType}:${item.directorTaskId}:${item.autoApprovalRecordId ?? ""}`}>
      <h2 className="font-medium">{item.novelTitle || item.taskTitle}</h2><p className="text-sm">{item.reasonLabel}</p><p className="text-sm text-muted-foreground">{item.followUpSummary}</p>
      {item.novelId ? <Button asChild size="sm" variant="outline"><Link to={getNovelEditHref(item.novelId)}>Open novel</Link></Button> : <p className="text-sm text-muted-foreground">View the novel creation result on desktop.</p>}
    </article>)}</div>
    {query.data?.data?.items.length === 0 ? <p className="text-sm text-muted-foreground">No notifications need follow-up.</p> : null}
  </section>;
}
