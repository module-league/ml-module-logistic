import { useSearchParams } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type DispatchPageProps = {
  sidebarId: string;
};

const DISPATCH_TABS = [
  { value: "ongoing", label: "Ongoing" },
  { value: "all", label: "All" },
  { value: "dispatched", label: "Dispatched" },
];

export default function DispatchPage(props: DispatchPageProps) {
  const { sidebarId } = props;
  // The picked tab lives in the URL (?tab=…), so it survives a reload and can be linked to
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = DISPATCH_TABS.some(
    (item) => item.value === searchParams.get("tab"),
  )
    ? (searchParams.get("tab") ?? DISPATCH_TABS[0].value)
    : DISPATCH_TABS[0].value;

  return (
    <Tabs
      value={tab}
      onValueChange={(next) =>
        setSearchParams(
          (params) => {
            params.set("tab", next);
            return params;
          },
          { replace: true },
        )
      }
      className="flex-col gap-4 pl-4"
    >
      <div className="flex items-center justify-between gap-3 border-b">
        <TabsList variant="line" className="h-10 gap-6 p-0">
          {DISPATCH_TABS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-full flex-none cursor-pointer gap-2 rounded-none border-0 px-0 font-normal text-muted-foreground before:size-1.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity after:hidden hover:text-foreground focus-visible:text-primary focus-visible:ring-0 focus-visible:outline-none data-[state=active]:text-foreground data-[state=active]:before:opacity-100"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button size="sm">Add Dispatch</Button>
      </div>
      {DISPATCH_TABS.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Truck />
              </EmptyMedia>
              <EmptyTitle>No {item.label.toLowerCase()} dispatches</EmptyTitle>
              <EmptyDescription>
                Dispatches you add show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      ))}
    </Tabs>
  );
}
