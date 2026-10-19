export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
      {/* Mental Health Glassmorphic Background */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[70%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[70%] rounded-full bg-secondary/40 blur-[140px] pointer-events-none" />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full p-4 flex justify-center">
        {children}
      </div>
    </div>
  );
}
