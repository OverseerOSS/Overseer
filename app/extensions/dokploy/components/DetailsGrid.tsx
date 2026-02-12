"use client";

interface DetailsGridProps {
  details: Record<string, any>;
  type: string;
}

export function DetailsGrid({ details, type }: DetailsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
      {details.showProject !== false && (
        <div className="space-y-1">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">Project</div>
          <div className="text-[14px] font-bold text-black truncate" title={details.projectName}>
            {details.projectName || '-'}
          </div>
        </div>
      )}
      
      {details.showEnvironment !== false && (
        <div className="space-y-1">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">Environment</div>
          <div className="text-[14px] font-bold text-black truncate">
            {details.envName || '-'}
          </div>
        </div>
      )}
      
      {details.showType !== false && (
        <div className="space-y-1">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">Type</div>
          <div className="text-[14px] font-bold text-black capitalize">
            {type}
          </div>
        </div>
      )}

      {details.showPort !== false && details.port && (
        <div className="space-y-1">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">External Port</div>
          <div className="text-[14px] font-mono font-black text-black">
            {details.port}
          </div>
        </div>
      )}

      {details.showImage !== false && details.image && (
        <div className="col-span-2 space-y-1.5 overflow-hidden">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">Docker Image</div>
          <div className="text-[11px] font-mono p-2.5 bg-gray-900 border border-black text-white font-bold truncate" title={details.image}>
            {details.image}
          </div>
        </div>
      )}

      {details.serviceCount !== undefined && (
        <div className="col-span-2 space-y-1">
          <div className="text-black font-black uppercase tracking-[0.15em] text-[10px]">Services in Stack</div>
          <div className="text-[14px] font-bold text-black">
            {details.serviceCount} service{details.serviceCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
