import { cn } from "~/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  styleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({
  level = 2,
  styleLevel,
  className,
  ...props
}: HeadingProps) {
  const resolvedLevel = styleLevel ?? level;
  const sizes = {
    1: "text-4xl",
    2: "text-3xl",
    3: "text-2xl",
    4: "text-xl",
    5: "text-lg",
    6: "text-base",
  };

  const headingClass = cn("font-semibold", sizes[resolvedLevel], className);
  if (resolvedLevel === 1) return <h1 className={headingClass} {...props} />;
  if (resolvedLevel === 2) return <h2 className={headingClass} {...props} />;
  if (resolvedLevel === 3) return <h3 className={headingClass} {...props} />;
  if (resolvedLevel === 4) return <h4 className={headingClass} {...props} />;
  if (resolvedLevel === 5) return <h5 className={headingClass} {...props} />;
  return <h6 className={headingClass} {...props} />;
}
