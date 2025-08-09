interface VariantGridProps {
  images: string[];
}

export default function VariantGrid({ images }: VariantGridProps) {
  if (!images?.length) return <div className="text-neutral-400">No variants</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {images.map((url, i) => (
        <img key={i} src={url} alt={`variant ${i + 1}`} className="w-full h-48 object-cover border rounded" />
      ))}
    </div>
  );
}


