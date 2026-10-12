import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import React, { useContext, useMemo, useState } from "react";

export interface DrawerOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
  /** @default "right" */
  direction?: "top" | "bottom" | "left" | "right";
  className?: string;
}

interface DrawerContextProps {
  open(options: DrawerOptions): void;
  close(): void;
}

const DrawerContext = React.createContext<DrawerContextProps | undefined>(
  undefined,
);

export function useDrawer() {
  const drawerContext = useContext(DrawerContext);
  if (!drawerContext) {
    throw new Error("useDrawer hook must be wrapped under DrawerProvider");
  }
  return drawerContext;
}

export function DrawerProvider(props: React.PropsWithChildren) {
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState<DrawerOptions | null>(null);

  const memoCtxValue = useMemo<DrawerContextProps>(
    () => ({
      open(next) {
        setOptions(next);
        setShow(true);
      },
      close() {
        setShow(false);
      },
    }),
    [],
  );

  return (
    <DrawerContext.Provider value={memoCtxValue}>
      {props.children}

      <Drawer
        open={show}
        onOpenChange={setShow}
        direction={options?.direction ?? "right"}
        onAnimationEnd={(open) => !open && setOptions(null)}
      >
        <DrawerContent
          {...(!options?.description && { "aria-describedby": undefined })}
          className={cn("data-[vaul-drawer-direction=right]:sm:max-w-md", options?.className)}
        >
          <DrawerHeader className="border-b">
            <DrawerTitle>{options?.title}</DrawerTitle>
            {options?.description && (
              <DrawerDescription>{options.description}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {options?.content}
          </div>
          {options?.footer && (
            <DrawerFooter className="flex-row justify-end border-t">{options.footer}</DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </DrawerContext.Provider>
  );
}
