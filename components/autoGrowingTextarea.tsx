import React, { useEffect, useRef } from "react";

export function AutoGrowingTextArea(props: {
  className: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
  maxHeight?: number;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current === null) return;
    // @ts-ignore
    ref.current.style.height = "5px";

    let maxH = props.maxHeight ?? 500;
    let minH = props.minHeight ?? 0;

    // @ts-ignore
    ref.current.style.height =
      // @ts-ignore
      Math.max(Math.min(ref.current.scrollHeight, maxH), minH) + "px";
  }, [ref.current, props.value]);

  return (
    <textarea
      ref={ref}
      className={props.className}
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.onChange}
      onKeyDown={props.onKeyDown ?? (() => {})}
      onBlur={props.onBlur ?? (() => {})}
    />
  );
}
