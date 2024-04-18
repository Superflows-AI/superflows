import React from "react";

export default function QuestionText(props: { questionText: string }) {
  return (
    <p>
      {props.questionText
        .split(/(\{\w+})/g)
        .map((part: string, idx: number) => {
          if (part.match(/\{(\w+)}/)) {
            return (
              <span key={idx} className={"text-blue-500"}>
                {part}
              </span>
            );
          } else {
            return <span key={idx}>{part}</span>;
          }
        })}
    </p>
  );
}
