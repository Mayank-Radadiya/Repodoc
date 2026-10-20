"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GitPullRequest } from "lucide-react";
import { signIn } from "next-auth/react";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REMEDIATION_FIX_IDS,
  RemediationRequestError,
  requestRemediation,
  type RemediationFixId,
  type RemediationResponse,
} from "@/lib/request-remediation";
import type { CheckResult, ParsedGitHubUrl } from "@/lib/types";
import { LicenseSelector, type LicenseChoice } from "./license-selector";
import { useReportTheme } from "./theme-scope";

export interface FixButtonProps extends ParsedGitHubUrl {
  checks: readonly CheckResult[];
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}

type AvailableFix = CheckResult & { id: RemediationFixId };

export function FixButton(props: FixButtonProps) {
  const fixes = props.checks
    .filter(
      (check): check is AvailableFix =>
        !check.passed &&
        check.remediation?.canAutomate === true &&
        REMEDIATION_FIX_IDS.some((id) => id === check.id),
    )
    .filter(
      (check, index, checks) =>
        checks.findIndex(({ id }) => id === check.id) === index,
    );
  if (!fixes.length) return null;
  return (
    <AuthGate>
      <FixFlow
        key={JSON.stringify([props.owner, props.repo, props.checks])}
        {...props}
        fixes={fixes}
      />
    </AuthGate>
  );
}

const singleLine = (value: string) =>
  value.trim().length > 0 && !/[\r\n\u2028\u2029]/.test(value);

function FixFlow({
  owner,
  repo,
  fixes,
  disabled = false,
  onPendingChange,
}: FixButtonProps & { fixes: AvailableFix[] }) {
  const { scopeElement } = useReportTheme();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<"closed" | "configure" | "license">(
    "closed",
  );
  const [selected, setSelected] = useState(
    () => new Set(fixes.map(({ id }) => id)),
  );
  const [licenseFullName, setLicenseFullName] = useState("");
  const [codeOfConductContact, setCodeOfConductContact] = useState("");
  const [pending, setPending] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const reconnectRequest = useRef(false);
  const [error, setError] = useState<RemediationRequestError | null>(null);
  const [result, setResult] = useState<RemediationResponse | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const request = useRef<AbortController | null>(null);
  const interrupted = useRef(false);
  const pendingCallback = useRef(onPendingChange);
  useEffect(() => {
    pendingCallback.current = onPendingChange;
  }, [onPendingChange]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || !interrupted.current) return;
      interrupted.current = false;
      setPending(false);
      setStep("configure");
      setError(new RemediationRequestError(
        "The request was interrupted. Its outcome is uncertain. Check the repository's open pull requests before trying again.", 0,
      ));
    });
    return () => {
      active = false;
      if (request.current) {
        interrupted.current = true;
        request.current.abort();
        request.current = null;
        pendingCallback.current?.(false);
      }
    };
  }, []);
  useEffect(() => {
    if (!error?.retryAt) return;
    const deadline = error.retryAt;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRetrySeconds(seconds);
      if (!seconds) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [error]);

  const needsLicense = selected.has("license");
  const needsContact = selected.has("code-of-conduct");
  const valid =
    selected.size > 0 &&
    (!needsLicense || singleLine(licenseFullName)) &&
    (!needsContact || singleLine(codeOfConductContact));
  const blocked = disabled || pending || reconnecting || retrySeconds > 0;

  async function reconnect() {
    if (reconnectRequest.current) return;
    reconnectRequest.current = true;
    setReconnecting(true);
    setReconnectError(null);
    try {
      await signIn("github", { redirectTo: window.location.href });
    } catch {
      reconnectRequest.current = false;
      setReconnecting(false);
      setReconnectError("Unable to reconnect GitHub. Please try again.");
    }
  }

  async function submit(licenseChoice?: LicenseChoice) {
    if (
      request.current ||
      blocked ||
      !valid ||
      (needsLicense && !licenseChoice)
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    pendingCallback.current?.(true);
    setError(null);
    setResult(null);
    setStep("configure");
    try {
      const response = await requestRemediation(
        {
          owner,
          repo,
          fixes: [...selected],
          ...(needsLicense ? { licenseChoice, licenseFullName } : {}),
          ...(needsContact ? { codeOfConductContact } : {}),
        },
        { signal: controller.signal },
      );
      if (request.current === controller && !controller.signal.aborted)
        setResult(response);
    } catch (cause) {
      if (request.current === controller && !controller.signal.aborted) {
        const failure =
          cause instanceof RemediationRequestError
            ? cause
            : new RemediationRequestError(
                "Unable to confirm remediation. Check open pull requests before trying again.",
                0,
              );
        setError(failure);
        setRetrySeconds(
          failure.retryAt
            ? Math.max(0, Math.ceil((failure.retryAt - Date.now()) / 1000))
            : 0,
        );
      }
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = null;
        setPending(false);
        pendingCallback.current?.(false);
      }
    }
  }

  const feedback = (
    <>
      <p
        role="status"
        aria-label="Remediation progress"
        aria-atomic="true"
        className="text-sm text-muted-foreground"
      >
        {pending
          ? "Creating remediation pull request… You can close this dialog while it finishes."
          : result
            ? "Remediation pull request ready."
            : ""}
      </p>
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive-foreground">
            {error.message}{" "}
            {retrySeconds > 0 && `Try again in ${retrySeconds} seconds.`}
          </p>
          {(error.status === 401 || error.status === 403) && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              loading={reconnecting}
              disabled={blocked}
              onClick={() => void reconnect()}
            >
              Reconnect GitHub
            </Button>
          )}
          {error.code === "workflow_scope_required" &&
            selected.has("ci-workflow") && selected.size > 1 && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={blocked}
              onClick={() => {
                setSelected((current) => {
                  const next = new Set(current);
                  next.delete("ci-workflow");
                  return next;
                });
                setError(null);
                setStep("configure");
              }}
            >
              Continue without CI workflow
            </Button>
          )}
          {reconnectError && (
            <p role="alert" className="text-sm text-destructive-foreground">
              {reconnectError}
            </p>
          )}
        </div>
      )}
      {result && (
        <div className="space-y-2 text-sm">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg font-medium text-info-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
            href={result.prUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View pull request{" "}
            <GitPullRequest aria-hidden="true" className="size-4" />
          </a>
          <p>Files included: {result.filesCreated.join(", ")}</p>
          <p className="text-muted-foreground">
            Your audited score stays the same until changes are merged and you
            re-audit.
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="flex max-w-80 min-w-0 flex-col gap-2 [overflow-wrap:anywhere]">
        <Button
          ref={trigger}
          className="min-h-11"
          disabled={disabled || pending}
          loading={pending}
          onClick={() => setStep("configure")}
        >
          <GitPullRequest aria-hidden="true" /> Fix All
        </Button>
        {step === "closed" && feedback}
      </div>
      <Dialog
        open={step === "configure"}
        onOpenChange={(open) => setStep(open ? "configure" : "closed")}
      >
        <DialogPopup
          className="max-w-xl motion-reduce:transition-none"
          portalProps={{ container: scopeElement ?? undefined }}
          finalFocus={step === "license" ? false : trigger}
          closeProps={{
            "aria-label": "Close remediation dialog",
            className: "absolute inset-e-2 top-2 min-h-11 min-w-11",
          }}
        >
          <DialogHeader className="pe-14">
            <DialogTitle>Fix repository findings</DialogTitle>
            <DialogDescription>
              Select fixes for {owner}/{repo}. Missing files are proposed
              together in one pull request. If you cannot push to this
              repository, we use a fork in your GitHub account.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <form
              id={`${id}-form`}
              onSubmit={(event) => {
                event.preventDefault();
                if (blocked || !valid || request.current) return;
                if (needsLicense) setStep("license");
                else void submit();
              }}
              className="space-y-4"
            >
              <fieldset
                disabled={pending || reconnecting || disabled || Boolean(result)}
                className="space-y-3"
              >
                <legend className="mb-2 text-sm font-medium">
                  Available fixes
                </legend>
                {fixes.map((fix) => (
                  <label
                    key={fix.id}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-input p-3"
                    htmlFor={`${id}-${fix.id}`}
                  >
                    <Checkbox
                      id={`${id}-${fix.id}`}
                      className="mt-1"
                      checked={selected.has(fix.id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (checked) next.add(fix.id);
                          else next.delete(fix.id);
                          return next;
                        })
                      }
                      aria-labelledby={`${id}-${fix.id}-name`}
                      aria-describedby={`${id}-${fix.id}-detail`}
                    />
                    <span className="min-w-0 text-sm">
                      <span
                        id={`${id}-${fix.id}-name`}
                        className="block font-medium"
                      >
                        {fix.name}
                      </span>
                      <span
                        id={`${id}-${fix.id}-detail`}
                        className="block text-muted-foreground [overflow-wrap:anywhere]"
                      >
                        {fix.remediation?.description}
                        <code className="mt-1 block text-xs">
                          {fix.remediation?.targetPath}
                        </code>
                      </span>
                    </span>
                  </label>
                ))}
                {needsLicense && (
                  <div className="space-y-2">
                    <label
                      htmlFor={`${id}-holder`}
                      className="block text-sm font-medium"
                    >
                      Copyright holder
                    </label>
                    <Input
                      id={`${id}-holder`}
                      nativeInput
                      required
                      className="min-h-11"
                      value={licenseFullName}
                      onChange={(event) =>
                        setLicenseFullName(event.target.value)
                      }
                      aria-describedby={`${id}-holder-help`}
                    />
                    <p
                      id={`${id}-holder-help`}
                      className="text-sm text-muted-foreground"
                    >
                      Enter the person or organization credited in the license.
                      A nonblank, single-line value is required. You will choose
                      the license next.
                    </p>
                  </div>
                )}
                {needsContact && (
                  <div className="space-y-2">
                    <label
                      htmlFor={`${id}-contact`}
                      className="block text-sm font-medium"
                    >
                      Code of conduct reporting contact
                    </label>
                    <Input
                      id={`${id}-contact`}
                      nativeInput
                      required
                      className="min-h-11"
                      value={codeOfConductContact}
                      onChange={(event) =>
                        setCodeOfConductContact(event.target.value)
                      }
                      aria-describedby={`${id}-contact-help`}
                    />
                    <p
                      id={`${id}-contact-help`}
                      className="text-sm text-muted-foreground"
                    >
                      Provide a single-line email address or contact method for
                      incident reports. This will be published in the code of
                      conduct.
                    </p>
                  </div>
                )}
              </fieldset>
              {!selected.size && (
                <p className="text-sm text-muted-foreground">
                  Select at least one fix to continue.
                </p>
              )}
              {feedback}
            </form>
          </DialogPanel>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" className="min-h-11" />}
            >
              {pending || result ? "Close" : "Cancel"}
            </DialogClose>
            {!result && (
              <Button
                ref={continueButton}
                className="min-h-11"
                type="submit"
                form={`${id}-form`}
                disabled={blocked || !valid}
                loading={pending}
              >
                {needsLicense
                  ? "Continue to license"
                  : error
                    ? "Try again"
                    : "Create pull request"}
              </Button>
            )}
          </DialogFooter>
        </DialogPopup>
      </Dialog>
      <LicenseSelector
        open={step === "license"}
        finalFocus={() => {
          continueButton.current?.focus();
          return false;
        }}
        onOpenChange={(open) => {
          if (!open)
            setStep((current) =>
              current === "license" ? "configure" : current,
            );
        }}
        onConfirm={({ licenseChoice }) => void submit(licenseChoice)}
      />
    </>
  );
}
