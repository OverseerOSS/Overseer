"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";
import { ExtensionCardProps } from "./types";
import { GenericMonitorCard } from "../components/GenericMonitorCard";

export function getExtensionCard(extensionId: string): ComponentType<ExtensionCardProps> {
  return dynamic(
    () =>
      import(`./${extensionId}/card`).catch(() => {
        // Fallback to generic card if extension card is not found or fails to load
        return { default: GenericMonitorCard };
      }),
    {
      loading: () => (
        <div className="h-24 w-full bg-white border-2 border-black border-dashed animate-pulse" />
      ),
      ssr: false,
    }
  );
}
