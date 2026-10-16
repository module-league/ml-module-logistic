import React from "react";
import { errorParser } from "@/hooks/useErrorParser";
import { CircleXIcon } from "lucide-react";
import { Button } from "../ui/button";

type ErrorResultProps = {
  error?: unknown;
  /** Main title of the error result. Should be the short, descriptive message */
  title?: React.ReactNode;
  /** Additional content of the error result, can be description, or render custom button for your user */
  content?: React.ReactNode;
  onRetry?(): void;
};

export default function ErrorResult(props: ErrorResultProps) {
  const { onRetry } = props;

  return (
    <div className="flex flex-col gap-4 p-8 w-full items-center">
      <CircleXIcon size="40" color="#ff3d32" />

      <h2>{props.title ?? errorParser(props.error)?.message}</h2>

      <div className="text-center">
        {props.content}
        {!!onRetry && (
          <div className="flex flex-row gap-4 justify-center pt-4">
            <Button onClick={() => onRetry()}>Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
