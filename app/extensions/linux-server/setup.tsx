"use client";

export default function LinuxServerSetup({ metadata }: { metadata: any }) {
  if (!metadata?.publicKey) return null;

  const command = `echo "${metadata.publicKey}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-black pl-4 py-1">
        <h5 className="text-xs font-bold uppercase tracking-widest text-black">SSH Access Required</h5>
        <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Run this command on your target server to authorize Overseer:</p>
      </div>

      <div className="relative group">
        <pre className="bg-black text-white p-5 text-[10px] font-mono break-all whitespace-pre-wrap border-2 border-black selection:bg-white selection:text-black">
          {command}
        </pre>
        <button 
           onClick={() => {
             navigator.clipboard.writeText(command);
           }}
           className="absolute top-2 right-2 bg-white text-black text-[10px] font-bold px-2 py-1 border border-black hover:bg-gray-200"
        >
          COPY
        </button>
      </div>

      <div className="bg-amber-50 border-2 border-black p-4">
          <p className="text-[10px] font-bold uppercase text-amber-900 leading-relaxed">
              Overseer uses this public key to connect and fetch metrics securely. Make sure the user has permissions to run commands like 'top' and 'free'.
          </p>
      </div>
    </div>
  );
}
