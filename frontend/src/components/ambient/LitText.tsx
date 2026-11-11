import type { CSSProperties, ElementType } from "react";

type Part = string | { em: string };

interface LitTextProps {
  as?: ElementType;
  id?: string;
  className?: string;
  parts: Part[];
  style?: CSSProperties;
}

/**
 * The confidence reveal: an important line starts barely lit and the words
 * fill with light one after another as it comes into view — like morning
 * light reaching across a wall. Uses the shared `data-reveal` observer, so it
 * fires once and respects reduced motion.
 */
export function LitText({ as: Tag = "h2", id, className, parts, style }: LitTextProps) {
  let index = 0;
  const words = parts.flatMap((part, partIndex) => {
    const isEm = typeof part !== "string";
    const text = isEm ? part.em : part;
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word, isEm, key: `${partIndex}-${index}`, i: index++ }));
  });

  return (
    <Tag id={id} className={`lit ${className ?? ""}`} data-reveal="lit" style={style}>
      {words.map(({ word, isEm, key, i }, n) => {
        const wordStyle = { ["--w" as string]: i } as CSSProperties;
        const node = isEm ? (
          <em key={key} className="lit__word" style={wordStyle}>
            {word}
          </em>
        ) : (
          <span key={key} className="lit__word" style={wordStyle}>
            {word}
          </span>
        );
        return n < words.length - 1 ? [node, " "] : [node];
      })}
    </Tag>
  );
}
