import { Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CheckedState } from "@radix-ui/react-checkbox";
import React, { useCallback, useMemo, useState } from "react";
import { errorParser } from "./useErrorParser";

export default function useDialog() {
  const dialogContext = React.useContext(DialogContext);
  if (!dialogContext) {
    throw new Error("useDialog hook must be wrapped under DialogContext");
  }

  return {
    message: useCallback(
      async (options: Omit<MessageOptions, "onClose">) => {
        return new Promise<void>((resolve) => {
          dialogContext.setOpenMessageDlg(true);
          dialogContext.setMessageDlgOpt({
            ...options,
            onClose() {
              resolve();
              dialogContext.setOpenMessageDlg(false);

              setTimeout(() => {
                dialogContext.resetMessageDlg();
              }, 400);
            },
          });
        });
      },
      [dialogContext],
    ),
    confirm: useCallback(
      async (options: Omit<ConfirmationOptions, "onSubmit" | "onDismiss">) => {
        return new Promise<boolean>((resolve) => {
          dialogContext.setOpenConfirmDlg(true);
          dialogContext.setConfirmDlgOpt({
            ...options,
            onDismiss() {
              resolve(false);
              dialogContext.setOpenConfirmDlg(false);

              // not sure if this is good idea
              // clear the dialog data after closed (visually removed from UI)
              // so this is done in background
              setTimeout(() => {
                dialogContext.resetConfirmDlg();
              }, 400);
            },
            onSubmit() {
              resolve(true);
              dialogContext.setOpenConfirmDlg(false);

              setTimeout(() => {
                dialogContext.resetConfirmDlg();
              }, 400);
            },
          });
        });
      },
      [dialogContext],
    ),
    promptError: useCallback(
      async (
        options: Omit<MessageOptions, "onClose" | "content"> & {
          error: Error | unknown | undefined;
          /** Use this when attempt to display `react-hook-form` error */
          isRhfError?: boolean;
          content?: React.ReactNode;
        },
      ) => {
        const { error, content, isRhfError = false, ...otherOptions } = options;
        let _content = content ?? <span>{errorParser(error)?.message}</span>;

        if (isRhfError) {
          console.error("form_error", error);
          _content =
            content ?? "Check console for details or contact the support";
        }

        return new Promise<void>((resolve) => {
          dialogContext.setOpenMessageDlg(true);
          dialogContext.setMessageDlgOpt({
            ...otherOptions,
            content: _content,
            onClose() {
              resolve();
              dialogContext.setOpenMessageDlg(false);

              setTimeout(() => {
                dialogContext.resetMessageDlg();
              }, 400);
            },
          });
        });
      },
      [dialogContext],
    ),
  };
}

// dont expose too many fancy stuffs here
type DialogButtonProps = Pick<
  ButtonProps,
  "variant" | "size" | "startIcon" | "isLoading" | "className" | "style"
>;

export interface ConfirmationOptions {
  /** Main title of dialog. It should be short and precise decsribing the event */
  title: React.ReactNode;
  /**
   * Additional message to the event.
   * It may include further detailed explanation to the event, event consequences,
   * possible recovery actions
   */
  content: React.ReactNode;
  /**
   * Optionally overrides the submission button content
   * @default "Yes"
   */
  submissionText?: React.ReactNode;
  /**
   * Optionnaly overrides the dismiss button content
   * @default "Cancel"
   */
  dismissText?: React.ReactNode;

  submissionBtnProps?: DialogButtonProps;
  dismissalBtnProps?: DialogButtonProps;

  /** Display a checkbox which user must check it in order to click submit button */
  withConsent?: boolean;
  /** Override default consent text. Use together with {@link withConsent} */
  consentText?: React.ReactNode;

  onDismiss(): void;
  onSubmit(): void;
}

export interface MessageOptions {
  /** Main title of dialog. It should be short and precise decsribing the event */
  title: React.ReactNode;
  /** Additional message to the event. It may include further detailed explanation to the event */
  content: React.ReactNode;
  /**
   * Optionally overrides the dismiss button content
   * @default "OK"
   */
  dismissText?: React.ReactNode;
  dismissalBtnProps?: DialogButtonProps;
  onClose(): void;
}

type DialogContextProps = {
  setOpenMessageDlg(nexState?: boolean | undefined): void;
  setOpenConfirmDlg(nexState?: boolean | undefined): void;
  setMessageDlgOpt: React.Dispatch<React.SetStateAction<MessageOptions>>;
  setConfirmDlgOpt: React.Dispatch<React.SetStateAction<ConfirmationOptions>>;
  resetMessageDlg(): void;
  resetConfirmDlg(): void;
};

const DialogContext = React.createContext<DialogContextProps | undefined>(
  undefined,
);

/**
 * Context provider to enable the use of useDialog hook
 *
 * This provider also renders 2 MUI Dialog component next to your child components.
 * This will enable MUI to take advantage of scoped theme
 */
export function DialogProvider(props: React.PropsWithChildren) {
  const [openMessageDlg, setOpenMessageDlg] = useState(false);
  const [messageDlgOpt, setMessageDlgOpt] = useState<MessageOptions>({
    title: "",
    content: "",
    onClose: () => {},
  });

  const [openConfirmDlg, setOpenConfirmDlg] = useState(false);
  const [confirmDlgOpt, setConfirmDlgOpt] = useState<ConfirmationOptions>({
    title: "",
    content: "",
    onDismiss: () => {},
    onSubmit: () => {},
  });

  const memoCtxValue = useMemo<DialogContextProps>(
    () => ({
      setOpenMessageDlg: (nextState) =>
        typeof nextState === "boolean"
          ? setOpenMessageDlg(nextState)
          : setOpenMessageDlg((s) => !s),
      setMessageDlgOpt,
      setOpenConfirmDlg: (nextState) =>
        typeof nextState === "boolean"
          ? setOpenConfirmDlg(nextState)
          : setOpenConfirmDlg((s) => !s),
      setConfirmDlgOpt,
      resetMessageDlg() {
        setOpenMessageDlg(false);
        setMessageDlgOpt({
          title: "",
          content: "",
          onClose: () => {},
        });
      },
      resetConfirmDlg() {
        setOpenConfirmDlg(false);
        setConfirmDlgOpt({
          title: "",
          content: "",
          onDismiss: () => {},
          onSubmit: () => {},
        });
      },
    }),
    [setOpenConfirmDlg, setOpenMessageDlg],
  );

  return (
    <DialogContext.Provider value={memoCtxValue}>
      {props.children}

      <MessageDialog {...messageDlgOpt} show={openMessageDlg} />
      <ConfirmDialog {...confirmDlgOpt} show={openConfirmDlg} />
    </DialogContext.Provider>
  );
}

interface MessageDialogProps extends MessageOptions {
  show: boolean;
}

const MessageDialog = React.memo(function MessageDialog(
  props: MessageDialogProps,
) {
  const {
    show,
    onClose,
    title,
    content,
    dismissText: submissionText = "OK",
    dismissalBtnProps,
  } = props;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>{content}</div>
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" {...dismissalBtnProps}>
              {submissionText}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

interface ConfirmDialogProps extends ConfirmationOptions {
  show: boolean;
}

/**
 * Renders a simple, general use of confirmation dialog
 *
 * Designed to be used together with utilities/dialog function
 */
const ConfirmDialog = React.memo(function ConfirmDialog(
  props: ConfirmDialogProps,
) {
  const {
    show,
    onDismiss,
    onSubmit,
    title,
    content,
    dismissText = "Cancel",
    submissionText = "Yes",
    consentText = "I understand the consequences and wish to proceed",
    withConsent,
    dismissalBtnProps,
    submissionBtnProps,
  } = props;

  const [isConsented, setIsConsented] = useState<CheckedState>(false);
  const _isConsented = !withConsent ? true : isConsented;

  return (
    <Dialog
      open={show}
      onOpenChange={() => {
        setIsConsented(false);
        onDismiss();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[500px] max-h-[550px] p-8 gap-8"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className={cn(withConsent && "px-4")}>
          {content}

          {withConsent && (
            <div className="pt-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={isConsented}
                  onCheckedChange={setIsConsented}
                />
                <span>{consentText}</span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button
            onClick={() => {
              setIsConsented(false);
              onDismiss();
            }}
            variant="ghost"
            {...dismissalBtnProps}
          >
            {dismissText}
          </Button>
          <Button
            disabled={!_isConsented}
            onClick={() => {
              if (withConsent && !isConsented) return;
              setIsConsented(false);
              onSubmit();
            }}
            variant="outline"
            {...submissionBtnProps}
          >
            {submissionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
