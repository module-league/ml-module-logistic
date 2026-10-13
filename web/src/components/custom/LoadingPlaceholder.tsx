import React from "react";
import clsx from "clsx";
import { LoadingSpinner } from "../ui/progress";
import LoadingIcon from "./LoadingIcon";

interface LoadingPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adjust circular progress size (Eg. 1rem, 20px). Default `24px` */
  loadingIconSize?: string | number;
  /**
   * True to set the container element fill parent (height, width and flex)
   * @default false
   */
  fillParent?: boolean;
  /**
   * Adds padding to the wrapping element.
   * If you have more complex styles, use css class instead
   * - Pass in true to set default padding value (1em)
   * - False to disable padding
   * - Or pass in custom CSS value (1em, 10px)
   * @default true
   */
  padding?: boolean | string;
  /** true to display fancy loading icon */
  fancy?: boolean;
  /** Customize loading text, default to `"Loading..."` */
  loadingText?: string;
}

export default React.memo(function LoadingPlaceholder(
  props: LoadingPlaceholderProps,
) {
  const {
    loadingIconSize = 32,
    fillParent = false,
    className,
    padding = true,
    fancy,
    loadingText,
    ...others
  } = props;

  const paddingCss = (() => {
    if (padding === true) return "1em";
    else if (padding === false) return undefined;
    else return padding;
  })();

  return (
    <div
      className={clsx(
        "flex flex-col justify-center items-center gap-4",
        fillParent && "h-full w-full flex-1",
        className,
      )}
      {...others}
      style={{ padding: paddingCss, ...others.style }}
    >
      {!fancy ? (
        <>
          <LoadingSpinner height={loadingIconSize} width={loadingIconSize} />
          <span>{loadingText ?? "Loading..."}</span>
        </>
      ) : (
        <LoadingIcon key="loading-icon" loadingText={loadingText} />
      )}
    </div>
  );
});
