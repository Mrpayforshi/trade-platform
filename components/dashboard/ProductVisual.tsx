type Props = { name: string; slug?: string | null; imageUrl?: string | null; className?: string };

type Kind = "solar" | "light" | "panel" | "generic";

function kindOf(name: string, slug?: string | null): Kind {
  const key = `${slug ?? ""} ${name}`.toLowerCase();
  if (key.includes("solar")) return "solar";
  if (/\bled\b|light|lamp/.test(key)) return "light";
  if (key.includes("cold") || key.includes("panel")) return "panel";
  return "generic";
}

/** Product image when ops has uploaded one; otherwise a drawn stand-in that
 *  matches the category. Colours come from the theme so dark mode works. */
export function ProductVisual({ name, slug, imageUrl, className = "" }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name} loading="lazy" className={`size-full object-cover ${className}`} />
    );
  }

  const kind = kindOf(name, slug);
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label={`${name} illustration`} className={`h-full max-h-40 w-auto ${className}`}>
      {kind === "solar" && (
        <>
          <ellipse cx="102" cy="124" rx="70" ry="7" className="fill-ink" opacity="0.12" />
          <polygon points="30,110 60,25 175,25 150,110" className="fill-ink stroke-paper" strokeWidth="3" strokeLinejoin="round" />
          <g className="stroke-mute" strokeWidth="1.2" opacity="0.8">
            <line x1="83" y1="25" x2="54" y2="110" /><line x1="106" y1="25" x2="78" y2="110" />
            <line x1="129" y1="25" x2="102" y2="110" /><line x1="152" y1="25" x2="126" y2="110" />
            <line x1="52.6" y1="46" x2="168.8" y2="46" /><line x1="45.2" y1="67" x2="162.6" y2="67" />
            <line x1="37.8" y1="88" x2="156.5" y2="88" />
          </g>
          <circle cx="162" cy="38" r="9" className="fill-amber" />
        </>
      )}
      {kind === "light" && (
        <>
          <line x1="100" y1="0" x2="100" y2="30" className="stroke-ink" strokeWidth="3" />
          <rect x="88" y="28" width="24" height="14" rx="3" className="fill-ink" />
          <path d="M58 76 A42 42 0 0 1 142 76 Z" className="fill-ink" />
          <ellipse cx="100" cy="77" rx="42" ry="7" className="fill-amber" />
          <g className="stroke-amber" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <line x1="68" y1="92" x2="56" y2="124" /><line x1="100" y1="94" x2="100" y2="130" /><line x1="132" y1="92" x2="144" y2="124" />
          </g>
        </>
      )}
      {kind === "panel" && (
        <>
          <ellipse cx="110" cy="124" rx="75" ry="7" className="fill-ink" opacity="0.12" />
          <polygon points="35,58 110,30 185,58 110,86" className="fill-card stroke-ink" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="35,58 110,86 110,108 35,80" className="fill-brand stroke-ink" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="110,86 185,58 185,80 110,108" className="fill-brand stroke-ink" opacity="0.75" strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
      {kind === "generic" && (
        <>
          <ellipse cx="100" cy="124" rx="62" ry="7" className="fill-ink" opacity="0.12" />
          <polygon points="40,50 100,26 160,50 100,74" className="fill-card stroke-ink" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="40,50 100,74 100,116 40,92" className="fill-ink" opacity="0.85" />
          <polygon points="100,74 160,50 160,92 100,116" className="fill-ink" opacity="0.6" />
        </>
      )}
    </svg>
  );
}
