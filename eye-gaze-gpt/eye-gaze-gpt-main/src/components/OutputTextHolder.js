import React, { useEffect, useState } from "react";
import OutputText from "./OutputText";

export function OutputTextHolder({ outputTextList, setOutputTextList, onSpeakButtonClick, isAdvanced }) {
  const [widthStyle, setWidthStyle] = useState('100%');

  useEffect(() => {
    setWidthStyle(isAdvanced ? '50%' : '100%');
  }, [isAdvanced]);

  const elements = [0, 1, 2];

  return (
    <div style={{ width: widthStyle }}>
      {elements.map((item, index) => (
        <OutputText
          text={outputTextList}
          setOutputTextList={setOutputTextList}
          onSpeakButtonClick={onSpeakButtonClick}
          isAdvanced={isAdvanced}
          id={item}
          key={item}
        />
      ))}
    </div>
  );
}
