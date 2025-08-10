interface VariantGridProps {
  images: string[];
}

export default function VariantGrid({ images }: VariantGridProps) {
  if (!images?.length) return <div className="text-foreground/60">No variants</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {images.map((url, i) => (
        <div key={i} className="relative w-full h-48 rounded border overflow-hidden bg-muted border-border">
          {/* Blurred background */}
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
          {/* Main image */}
          <img src={url} alt={`variant ${i + 1}`} className="relative w-full h-full object-contain p-1" />
        </div>
      ))}
    </div>
  );
}


