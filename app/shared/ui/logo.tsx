import { cn } from "~/shared/lib/cn";

// The "Kristal N" mark and the wordmark, same artwork as web-landing (src/assets/brand).

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="24 20 60 68"
      className={cn("h-8 w-auto", className)}
      aria-hidden="true"
    >
      <polygon
        points="54,24 28,39 28,69 54,84"
        fill="#C4AEF2"
        stroke="#C4AEF2"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon
        points="54,24 80,39 80,69 54,84"
        fill="#9F80DC"
        stroke="#9F80DC"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M43 66V42L65 66V42"
        fill="none"
        stroke="#150F26"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="NARRATIV" className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 682 73.6"
        className="h-3.5 w-auto text-fg"
        aria-hidden="true"
      >
        <path
          transform="translate(-8.2 73.6)"
          d="M23.40 0L8.20 0L8.20-73L35.10-73L62.60-13.30L64-13.30L64-73L79.40-73L79.40 0L52.30 0L24.80-59.70L23.40-59.70L23.40 0M125.30 0L108.90 0L133-73L159.50-73L184.50 0L167.50 0L161.60-18.10L131.10-18.10L125.30 0M135.40-31.70L157.10-31.70L148-59.60L144.30-59.60L135.40-31.70M230.40 0L214 0L214-73.60L242.70-73.60Q251.80-73.60 258.50-70.85Q265.20-68.10 268.80-62.70Q272.40-57.30 272.40-49.10L272.40-47.50Q272.40-39.40 268.80-34.10Q265.20-28.80 258.70-26.10L277.30 0L258.30 0L242.40-23.40L230.40-23.40L230.40 0M244-59.70L230.40-59.70L230.40-36.30L244-36.30Q247.60-36.30 250.25-37.75Q252.90-39.20 254.35-41.85Q255.80-44.50 255.80-48Q255.80-51.50 254.35-54.15Q252.90-56.80 250.25-58.25Q247.60-59.70 244-59.70M323.40 0L307 0L307-73.60L335.70-73.60Q344.80-73.60 351.50-70.85Q358.20-68.10 361.80-62.70Q365.40-57.30 365.40-49.10L365.40-47.50Q365.40-39.40 361.80-34.10Q358.20-28.80 351.70-26.10L370.30 0L351.30 0L335.40-23.40L323.40-23.40L323.40 0M337-59.70L323.40-59.70L323.40-36.30L337-36.30Q340.60-36.30 343.25-37.75Q345.90-39.20 347.35-41.85Q348.80-44.50 348.80-48Q348.80-51.50 347.35-54.15Q345.90-56.80 343.25-58.25Q340.60-59.70 337-59.70M409.50 0L393.10 0L417.20-73L443.70-73L468.70 0L451.70 0L445.80-18.10L415.30-18.10L409.50 0M419.60-31.70L441.30-31.70L432.20-59.60L428.50-59.60L419.60-31.70M522.60 0L506.20 0L506.20-58.70L485.70-58.70L485.70-73L543.20-73L543.20-58.70L522.60-58.70L522.60 0M590.10 0L573.70 0L573.70-73L590.10-73L590.10 0M669.50 0L642.80 0L620.60-73L637.50-73L654.60-13.30L658-13.30L673.80-73L690.20-73"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
