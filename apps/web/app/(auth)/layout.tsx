export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-dvh w-full relative flex flex-col justify-center items-center overflow-x-hidden bg-background py-8 sm:py-12 px-4">
      {/* Mental Health Glassmorphic Background (fixed to viewport so glows persist cleanly when scrolling) */}
      <div className="fixed top-[-10%] left-[-20%] w-[60%] h-[70%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-20%] w-[60%] h-[70%] rounded-full bg-secondary/40 blur-[140px] pointer-events-none" />
      
      {/* Content wrapper with my-auto for clean vertical centering without clipping on tall forms */}
      <div className="relative z-10 w-full flex justify-center my-auto">
        {children}
      </div>
    </div>
  );
}
