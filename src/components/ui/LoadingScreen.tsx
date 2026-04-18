export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[300] bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
      <div className="flex items-center gap-3">
        {/* Horizontal Pulsing Dots Animation */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 bg-[#3B82F6] rounded-full animate-[pulse-scale_1.4s_infinite_ease-in-out_both] shadow-sm"
            style={{ 
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse-scale {
          0%, 80%, 100% { 
            transform: scale(0.6);
            opacity: 0.5;
          } 
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}



