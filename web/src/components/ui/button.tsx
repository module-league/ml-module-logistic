import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./progress";
import { NavLink, type NavLinkProps } from "react-router-dom";

const buttonVariants = cva(
  cn(
    "inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
    "ring-offset-background transition-colors focus-visible:outline-2 outline-primary disabled:pointer-events-none disabled:opacity-50",
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        destructive_ghost: "text-red-600 hover:text-red-700 hover:bg-red-100",
        destructive_outline:
          "bg-background text-red-600 border border-red-600 hover:bg-red-100",
        success: "bg-green-600 text-primary-foreground hover:bg-green-700",
        success_ghost: "text-green-600 hover:text-green-700 hover:bg-green-100",
        success_outline:
          "bg-background text-green-600 border border-green-600 hover:bg-green-100",
        warning: "bg-orange-600 text-primary-foreground hover:bg-orange-700",
        warning_ghost:
          "text-orange-600 hover:text-orange-700 hover:bg-orange-100",
        warning_outline:
          "bg-background text-orange-600 border border-orange-600 hover:bg-orange-100",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-slate-200 text-secondary-foreground hover:bg-slate-300",
        ghost: "text-secondary hover:bg-black/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        md: "h-10 px-4 py-2",
        xs: "h-7 px-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10 p-1",
        "icon-sm": "h-7 w-7 p-0.5",
      },
      selected: {
        true: "bg-slate-200 text-black hover:bg-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const spinnerVariants = cva("", {
  variants: {
    variant: {
      default: "text-background",
      destructive: "text-background",
      destructive_ghost: "text-red-600",
      destructive_outline: "text-red-600",
      success: "text-background",
      success_ghost: "text-green-600",
      success_outline: "text-green-600",
      warning: "text-background",
      warning_ghost: "text-orange-600",
      warning_outline: "text-orange-600",
      outline: "",
      secondary: "text-background",
      ghost: "",
      link: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  startIcon?: React.ReactNode;
  isLoading?: boolean;
  /** @default 14 */
  loadingIconSize?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      className,
      variant,
      size,
      asChild = false,
      startIcon,
      isLoading,
      loadingIconSize = 14,
      children,
      disabled,
      type = "button",
      selected,
      ...others
    } = props;

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, selected, className }))}
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        {...others}
      >
        {size === "icon" || size === "icon-sm" ? (
          isLoading ? (
            <LoadingSpinner
              size={loadingIconSize}
              role="progressbar"
              className={spinnerVariants({ variant })}
            />
          ) : (
            // backward compaibility... unfortunate
            <>
              {startIcon}
              {children}
            </>
          )
        ) : (
          <>
            {isLoading ? (
              <LoadingSpinner
                size={loadingIconSize}
                role="progressbar"
                className={spinnerVariants({ variant })}
              />
            ) : (
              startIcon
            )}
            {children}
          </>
        )}
      </Comp>
    );
  },
);

const LinkButton = React.forwardRef<
  HTMLAnchorElement,
  Pick<
    ButtonProps,
    | "variant"
    | "size"
    | "isLoading"
    | "selected"
    | "children"
    | "startIcon"
    | "title"
    | "style"
  > &
    NavLinkProps & {
      /** True to enable built-in style for active links */
      activeStyle?: boolean;
    }
>(function LinkButton(props, ref) {
  const {
    to,
    className,
    variant = "ghost",
    size,
    startIcon,
    isLoading,
    selected,
    children,
    activeStyle = false,
    ...others
  } = props;

  return (
    <NavLink
      to={to}
      className={(props) =>
        cn(
          buttonVariants({
            variant,
            size,
            selected: selected || (activeStyle && props.isActive),
          }),
          typeof className === "function" ? className?.(props) : className,
        )
      }
      ref={ref}
      {...others}
    >
      {isLoading ? <LoadingSpinner width={14} role="progressbar" /> : startIcon}
      {children}
    </NavLink>
  );
});

export { Button, buttonVariants, LinkButton };
