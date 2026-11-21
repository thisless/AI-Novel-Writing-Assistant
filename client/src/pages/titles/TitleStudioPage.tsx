import { useMemo, useState } from "react";
import { NOVEL_LIST_PAGE_LIMIT_MAX } from "@ai-novel/shared/types/pagination";
import { useQuery } from "@tanstack/react-query";
import { flattenGenreTreeOptions, getGenreTree } from "@/api/genre";
import { getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TitleFactoryPanel from "./components/TitleFactoryPanel";
import TitleLibraryPanel from "./components/TitleLibraryPanel";

export default function TitleStudioPage() {
  const [tab, setTab] = useState("factory");
  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });
  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, NOVEL_LIST_PAGE_LIMIT_MAX),
    queryFn: () => getNovelList({ page: 1, limit: NOVEL_LIST_PAGE_LIMIT_MAX }),
  });

  const genreTree = genreTreeQuery.data?.data ?? [];
  const genreOptions = useMemo(() => flattenGenreTreeOptions(genreTree), [genreTree]);
  const novels = novelListQuery.data?.data?.items ?? [];

  return (
    <Tabs value={tab} onValueChange={setTab} className="mx-auto w-full max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground">Title Studio</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate title ideas from project materials, a creative brief, or a reference title. Copy your favorites or save them to the library for later.
            </p>
          </div>

          <TabsList className="grid h-11 w-full grid-cols-2 rounded-full bg-muted/30 p-1 md:w-[300px]">
            <TabsTrigger value="factory" className="rounded-full">Generate ideas</TabsTrigger>
            <TabsTrigger value="library" className="rounded-full">Title library</TabsTrigger>
          </TabsList>
        </div>
      </header>

      <TabsContent value="factory" className="mt-0">
        <TitleFactoryPanel genreTree={genreTree} novels={novels} />
      </TabsContent>

      <TabsContent value="library" className="mt-0">
        <TitleLibraryPanel genreOptions={genreOptions} />
      </TabsContent>
    </Tabs>
  );
}
