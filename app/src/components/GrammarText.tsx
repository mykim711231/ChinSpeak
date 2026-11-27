import { Fragment } from 'react';
import type { GrammarReading } from '../types/lesson';

/** Inline ruby keeps Korean explanation and Chinese formulas in the same text flow. */
export default function GrammarText({ text, readings = [], showPinyin }: { text: string; readings?: GrammarReading[]; showPinyin: boolean }) {
  const label = text.match(/^(핵심|문형|주의):\s*/);
  const labelNode = label ? <><strong className="text-brand mr-1">{label[1]}</strong> </> : null;
  const start = label?.[0].length ?? 0;
  if (!showPinyin || !readings.length) return <>{labelNode}{text.slice(start)}</>;
  let previous = start;
  return <span className="grammar-annotated">
    {labelNode}
    {readings.map(reading => {
      const prefix = text.slice(previous, reading.start);
      previous = reading.start + reading.text.length;
      return <Fragment key={reading.start}>{prefix}<span lang="zh-Hans" data-grammar-han>
        {[...reading.text].map((ch, index) => <ruby key={index}>{ch}<rt lang="zh-Latn-pinyin">{reading.pinyin[index]}</rt></ruby>)}
      </span></Fragment>;
    })}
    {text.slice(previous)}
  </span>;
}
