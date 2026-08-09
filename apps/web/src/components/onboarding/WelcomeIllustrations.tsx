import { Icon } from "@activity-match/ui";

/** Abstract activity card — no photos, no faces */
export function ActivityCardIllustration() {
  return (
    <div className="w-full aspect-square max-w-[280px] bg-surface-container-low rounded-xl relative shadow-[0_12px_24px_rgba(0,0,0,0.04)] flex items-center justify-center p-4 border border-surface-dim">
      <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container rounded-xl" />
      <div className="relative w-full h-3/4 bg-white rounded-lg shadow-sm border border-outline-variant p-4 flex flex-col gap-4 -rotate-3">
        <div className="h-6 w-3/4 bg-surface-dim rounded" />
        <div className="flex gap-2 items-center">
          <div className="h-4 w-4 bg-primary-container rounded-full opacity-30" />
          <div className="h-4 w-1/2 bg-surface-variant rounded" />
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-8 w-16 bg-primary-fixed rounded-full opacity-30" />
          <div className="h-8 w-16 bg-primary-fixed rounded-full opacity-30" />
        </div>
        <div className="absolute -right-4 top-4 bg-surface rounded-full p-2 shadow-sm border border-surface-dim text-primary">
          <Icon name="event" />
        </div>
        <div className="absolute -left-2 -bottom-2 bg-surface rounded-full p-2 shadow-sm border border-surface-dim text-secondary-container">
          <Icon name="location_on" />
        </div>
      </div>
    </div>
  );
}

/** Text input morphing into a structured activity card */
export function CreateActivityIllustration() {
  return (
    <div className="relative w-full max-w-sm h-48 flex items-center justify-center">
      <div className="absolute w-64 h-64 bg-primary-fixed opacity-20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute w-48 h-48 bg-secondary-fixed opacity-30 rounded-full blur-2xl right-[10%] top-[20%] animate-pulse" />
      <div className="relative bg-surface-container-lowest shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-surface-dim rounded-2xl p-5 w-[85%] z-10">
        <div className="h-3 w-2/3 bg-surface-variant rounded-full mb-3" />
        <div className="h-2 w-1/2 bg-surface-dim rounded-full mb-4" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-primary-fixed-dim rounded-full opacity-60" />
          <div className="h-6 w-16 bg-secondary-fixed rounded-full opacity-60" />
        </div>
      </div>
      <div className="absolute top-1/4 left-1/4 w-12 h-12 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-primary">
        <Icon name="directions_walk" filled />
      </div>
      <div className="absolute bottom-1/3 right-1/4 w-10 h-10 bg-surface-container-lowest rounded-full shadow-md flex items-center justify-center text-secondary">
        <Icon name="group" filled />
      </div>
    </div>
  );
}

/** Group chat + calendar coordination — abstract, no portraits */
export function PlanTogetherIllustration() {
  return (
    <div className="relative w-full max-w-[280px] h-[320px] mx-auto">
      <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-60" />
      <div className="absolute top-[10%] left-0 bg-surface-container-high p-4 rounded-2xl rounded-tl-sm shadow-md flex items-start gap-3 w-[85%] z-10">
        <div className="w-8 h-8 rounded-full bg-secondary-container flex-shrink-0 flex items-center justify-center">
          <Icon name="chat" className="text-on-secondary-container text-sm" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-2 bg-outline-variant/30 rounded w-3/4" />
          <div className="h-2 bg-outline-variant/30 rounded w-1/2" />
        </div>
      </div>
      <div className="absolute top-[35%] right-0 bg-primary-container p-4 rounded-2xl rounded-tr-sm shadow-md w-[80%] z-20">
        <div className="space-y-2 flex flex-col items-end">
          <div className="h-2 bg-on-primary-container/40 rounded w-full" />
          <div className="h-2 bg-on-primary-container/40 rounded w-2/3" />
        </div>
      </div>
      <div className="absolute bottom-[10%] left-[10%] bg-surface-container-lowest p-5 rounded-2xl shadow-lg border border-outline-variant/20 flex flex-col gap-4 w-[90%] z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="event" className="text-primary" filled />
          </div>
          <div>
            <div className="h-3 bg-on-surface rounded w-24 mb-1" />
            <div className="h-2 bg-on-surface-variant rounded w-16" />
          </div>
        </div>
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-secondary-container border-2 border-surface-container-lowest" />
          <div className="w-6 h-6 rounded-full bg-primary-container border-2 border-surface-container-lowest" />
          <div className="w-6 h-6 rounded-full bg-surface-variant border-2 border-surface-container-lowest flex items-center justify-center">
            <span className="text-[8px] font-label-bold text-on-surface-variant">+3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
