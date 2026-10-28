import React, { isValidElement, type JSX } from "react";
import { errorParser } from "@/hooks/useErrorParser";
import { Button } from "../ui/button";
import { LoadingPlaceholder } from "./LoadingPlaceholder";
import { ErrorResult } from "./ErrorResult";

type QueryWrapperProps = {
  isLoading: boolean;
  error: unknown;
  children: React.ReactNode;
  onRetry?: () => void;
  /** Render custom loading component. Default to {@link LoadingPlaceholder} */
  renderLoader?: React.ReactNode | (() => JSX.Element);
  /** Render custom error component. Default to {@link ErrorResponsePlaceholder} */
  renderError?: (
    error: ReturnType<typeof errorParser> | undefined,
  ) => React.ReactNode;
  fancy?: boolean;
  loadingText?: string;
};

/**
 * A simple wrapper to simplify API loading, error state in your component.
 * You must put this under your "main" wrapper element, so the DOM tree stays consistent
 *
 * If this wrapper does not fullfill your requirement, use the internal components instead
 * {@link LoadingPlaceholder} and {@link ErrorResponsePlaceholder}
 *
 * @example
 * ```tsx
 * const {data, isLoading, error} = useQuerySomething()
 *
 * return (
 *  <div your-container-element>
 *    <QueryWrapper isLoading={isLoading} error={error}>
 *      {children here}
 *    </QueryWrapper>
 *  </div>
 * );
 * ```
 *
 * =================================
 *
 * The DOM tree would look like this
 * ```tsx
 * // loading state
 * <div your-container-element>
 *    <LoadingPlaceholder />
 * </div>
 *
 * // error state
 * <div your-container-element>
 *   <ErrorResponsePlaceholder />
 * </div>
 *
 * // not loading, no error
 * <div your-container-element>
 *   {children}
 * </div>
 * ```
 */
export function QueryWrapper(props: QueryWrapperProps) {
  const { onRetry } = props;

  if (props.isLoading) {
    if (isValidElement(props.renderLoader)) {
      return props.renderLoader;
    } else if (typeof props.renderLoader === "function") {
      return props.renderLoader();
    } else {
      return (
        <LoadingPlaceholder
          fillParent
          fancy={props.fancy}
          loadingText={props.loadingText}
        />
      );
    }
  }

  if (props.error != null) {
    if (props.renderError) {
      return props.renderError(errorParser(props.error));
    } else {
      return (
        <ErrorResult
          title="Something went wrong..."
          content={
            <>
              <div className="pb-4">{errorParser(props.error)?.message}</div>
              {!!onRetry && (
                <Button onClick={() => onRetry()}>Try again</Button>
              )}
            </>
          }
        />
      );
    }
  }

  return <>{props.children}</>;
}
