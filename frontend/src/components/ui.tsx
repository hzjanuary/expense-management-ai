import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "small" | "default" | "large" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseButtonClassName =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold tracking-normal transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-accent disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  danger:
    "bg-rose-700 text-white hover:bg-rose-800 border border-rose-700",
  ghost:
    "border border-transparent bg-transparent text-ledger-ink hover:bg-ledger-wash",
  outline:
    "border border-ledger-line bg-white text-ledger-ink hover:border-ledger-accent hover:text-ledger-accent",
  primary:
    "border border-ledger-accent bg-ledger-accent text-white hover:bg-ledger-accent-strong hover:border-ledger-accent-strong",
  secondary:
    "border border-ledger-line bg-ledger-accent-soft text-ledger-accent hover:border-ledger-accent",
};

const buttonSizes: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  icon: "h-10 w-10 p-0 text-sm",
  large: "h-11 px-5 text-sm",
  small: "h-9 px-3 text-xs",
};

export function buttonClassName({
  className,
  size = "default",
  variant = "primary",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}): string {
  return [
    baseButtonClassName,
    buttonVariants[variant],
    buttonSizes[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      size = "default",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        className={buttonClassName({ className, size, variant })}
        ref={ref}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export const panelClassName =
  "rounded-lg border border-ledger-line bg-ledger-panel p-5 shadow-soft";

export const subtlePanelClassName =
  "rounded-md border border-ledger-line bg-white p-4";

export const inputClassName =
  "h-10 rounded-md border border-ledger-line bg-white px-3 text-sm text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent";

export const inputLargeClassName =
  "h-11 rounded-md border-ledger-line bg-white text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent";

export const selectClassName =
  "h-10 rounded-md border border-ledger-line bg-white px-3 text-sm text-ledger-ink focus:border-ledger-accent focus:ring-ledger-accent";

export const selectLargeClassName =
  "h-11 rounded-md border-ledger-line bg-white text-sm text-ledger-ink focus:border-ledger-accent focus:ring-ledger-accent";

export const textareaClassName =
  "min-h-24 resize-y rounded-md border-ledger-line bg-white text-ledger-ink placeholder:text-ledger-muted focus:border-ledger-accent focus:ring-ledger-accent";
