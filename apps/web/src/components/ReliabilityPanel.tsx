import type { ReliabilityDisplay } from "@activity-match/shared";

interface ReliabilityPanelProps {
  reliability: ReliabilityDisplay | undefined;
}

export function ReliabilityPanel({ reliability }: ReliabilityPanelProps) {
  const isNew = reliability?.is_new ?? reliability?.label === "New to the platform";

  return (
    <section className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container-low">
      <h3 className="text-label-bold text-on-surface mb-4">Reliability Record</h3>
      {isNew ? (
        <p className="text-body-md text-on-surface-variant">
          New to the platform. Join your first activity to start building your record.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col">
              <span className="text-headline-lg-mobile font-extrabold text-on-surface">
                {reliability?.attended_count ?? 0}
              </span>
              <span className="text-body-md text-on-surface-variant">attended</span>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg-mobile font-extrabold text-on-surface">
                {reliability?.late_cancellation_count ?? 0}
              </span>
              <span className="text-body-md text-on-surface-variant">late cancellation</span>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg-mobile font-extrabold text-on-surface">
                {reliability?.no_show_count ?? 0}
              </span>
              <span className="text-body-md text-on-surface-variant">didn&apos;t come</span>
            </div>
          </div>
          <p className="text-body-md text-on-surface-variant">
            This record helps hosts plan and ensures everyone has a great time.
          </p>
        </>
      )}
    </section>
  );
}
