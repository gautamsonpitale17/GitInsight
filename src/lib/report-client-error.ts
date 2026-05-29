type ReportClientErrorContext = {
  sectionName: string;
  componentStack?: string;
};

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, context?: { tags?: Record<string, string> }) => void;
    };
  }
}

function reportToAxiom(error: Error, context: ReportClientErrorContext): void {
  const token = process.env.NEXT_PUBLIC_AXIOM_TOKEN;
  const dataset = process.env.NEXT_PUBLIC_AXIOM_DATASET;
  if (!token || !dataset) {
    return;
  }

  void fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        level: "error",
        message: error.message,
        section: context.sectionName,
        stack: error.stack,
        componentStack: context.componentStack,
      },
    ]),
    keepalive: true,
  }).catch(() => {
    // Optional telemetry — ignore ingest failures.
  });
}

export function reportClientError(error: Error, context: ReportClientErrorContext): void {
  console.error(`[${context.sectionName}]`, error, context.componentStack);

  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.captureException(error, {
      tags: { section: context.sectionName },
    });
  }

  reportToAxiom(error, context);
}
