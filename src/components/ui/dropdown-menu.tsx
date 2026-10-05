"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align="end"
        sideOffset={4}
        collisionPadding={8}
        className={cn(
          "z-50 min-w-52 rounded-2xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-[fade-in_120ms_ease-out]",
          className,
        )}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentPropsWithoutRef<typeof Menu.Item> & { destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm outline-none select-none data-[highlighted]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-destructive [&_svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border" />;
}
