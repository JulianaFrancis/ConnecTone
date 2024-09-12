import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@mui/material";
import Keyboard from "react-simple-keyboard";
import { io } from "socket.io-client";
import axios from 'axios';
import "react-simple-keyboard/build/css/index.css";
import 'simple-keyboard/build/css/index.css';
import "./App.css";
import "./keyboard.css";
import { OutputTextHolder } from "./components/OutputTextHolder";
import { AdvancedControl } from "./components/AdvancedControl";
import AudioRecorder from './components/AudioRecorder';
import ToggleSwitch from './components/ToggleSwitch';

function App() {
  const date = new Date();
  const [config, setConfig] = useState(null); // State to store the config
  const [input, setInput] = useState("");
  const [layoutName, setLayoutName] = useState("default");
  const [layoutData, setLayoutData] = useState();
  const [stage, setStage] = useState(0);
  const [prevTime, setPrevTime] = useState(date.getTime());
  const [fullInput, setFullInput] = useState({});
  const [outputTextList, setOutputTextList] = useState([{ text: "", mood: "mixed" }, { text: "", mood: "mixed" }, { text: "", mood: "mixed" }]);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState(["aaa", "bbb", "ccc"]);
  const [isAdvanced, setIsAdvanced] = useState(true);
  const [ttsParams, setTtsParams] = useState({}); // State for dynamic TTS parameters
  const [lastRecordedText, setLastRecordedText] = useState('');

  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [mousePosBatch, setMousePosBatch] = useState([]);
  const trackInterval = 250; // Track mouse position 4 times a second
  const sendInterval = 10000; // Send batch every 10 seconds

  const keyboard = useRef();
  const socketRef = useRef();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log("Fetching config...");
        const response = await axios.get('http://localhost:5000/config');
        console.log("Config fetched:", response.data);
        setConfig(response.data);
        setTtsParams(response.data.tts_params); // Load dynamic TTS parameters from config

        // Set the layout based on the config
        const languageLayout = response.data.keyboardLayout || "english"; // Default to English if no layout is provided
        try {
          const layoutModule = await import(`simple-keyboard-layouts/build/layouts/${languageLayout}`);
          setLayoutData(layoutModule.default);

        } catch (error) {
          console.error(`Error loading layout: ${languageLayout}`, error);
          const defaultLayout = await import(`simple-keyboard-layouts/build/layouts/english`);
          setLayoutData(defaultLayout.default);
          // Edit this to load default TTS parameters
        }
      } catch (error) {
        console.log("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (config) {
      const socketUrl = config.socketUrl || 'ws://localhost:8765';
      socketRef.current = io(socketUrl);

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      socketRef.current.on('response', (data) => {
        const response = JSON.parse(data);
        if (response && response.request_type) {
          switch (response.request_type) {
            case "PREDICT":
              var moods = ["conversation", "mixed", "reading"];
              const random1 = moods[Math.floor(Math.random() * moods.length)];
              const random2 = moods[Math.floor(Math.random() * moods.length)];
              const random3 = moods[Math.floor(Math.random() * moods.length)];
              setOutputTextList([{ text: response.data.options[0], mood: random1 }, { text: response.data.options[1], mood: random2 }, { text: response.data.options[2], mood: random3 }]);
              break;
            case "SYNTHESISE":
              handleVoice(response.data);
              break;
            case "AUTOCOMPLETE":
              setAutoCompleteSuggestions(response.data.options);
              break;
            case "AUDIO_DATA":
              setLastRecordedText(response.data);
              break;
            default:
              break;
          }
        }
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [config]);

  const handleAudioReady = (base64data) => {
    const message = {
      request_type: "AUDIO_DATA",
      data: { audio: base64data }
    };
    socketRef.current.emit('message', JSON.stringify(message));
  };

  const toggleAdvanced = () => {
    setIsAdvanced(prevState => !prevState);
  };

  const toggleRecording = () => {
    setRecordingEnabled(prevState => !prevState);
  };

  const handleMouseMove = (event) => {
    const mousePosTime = { time: new Date().getTime(), x: event.clientX, y: event.clientY };
    setMousePosBatch(prevBatch => [...prevBatch, mousePosTime]);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      window.addEventListener('mousemove', handleMouseMove);
      setTimeout(() => {
        window.removeEventListener('mousemove', handleMouseMove);
      }, trackInterval);
    }, trackInterval);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [trackInterval]);

  useEffect(() => {
    const sendMouseData = () => {
      trackEvent("mouse_move", { positions: mousePosBatch });
      setMousePosBatch([]); // Clear the batch after sending
    };

    const intervalId = setInterval(() => {
      sendMouseData();
    }, sendInterval);

    return () => clearInterval(intervalId);
  }, [mousePosBatch, sendInterval]);

  const handleSendMessage = useCallback((request) => {
    socketRef.current.emit('message', JSON.stringify(request));
  }, []);

  useEffect(() => {
    if (input.length !== 0) {
      handleSendMessage({ request_type: "AUTOCOMPLETE", data: { input: input } });
    }
  }, [input, handleSendMessage]);

  const onChange = input => {
    setInput(input);
    trackEvent("keyboard_input", { input });
  };

  const handleShift = () => {
    const newLayoutName = layoutName === "default" ? "shift" : "default";
    setLayoutName(newLayoutName);
  };

  const onKeyPress = button => {
    TrackButtons(button);
    if (button === "{shift}" || button === "{lock}") handleShift();
    trackEvent("key_press", { button });
  };

  function TrackButtons(button) {
    const currTime = date.getTime();
    if (!(stage in fullInput)) {
      fullInput[stage] = [{ timeSince: 0, button: button }];
    } else {
      fullInput[stage] = fullInput[stage].concat([{ timeSince: currTime - prevTime, button: button }]);
    }
    setPrevTime(currTime);
    setFullInput(fullInput);
  }

  const onChangeInput = event => {
    const input = event.target.value;
    setInput(input);
    keyboard.current.setInput(input);
    trackEvent("input_change", { input });
  };

  const onClearButtonClick = () => {
    setInput("");
    keyboard.current.setInput("");
    TrackButtons("CLEAR");
    trackEvent("button_click", { button: "Clear" });
  };

  const addSuggestionToInput = (text) => {
    TrackButtons(text);
    let newInput;
    if (input.charAt(input.length - 1) === " " || input.length === 0) {
      newInput = input + text + " ";
    } else {
      newInput = input + " " + text + " ";
    }
    setInput(newInput);
    keyboard.current.setInput(newInput);
    trackEvent("button_click", { button: "Suggestion", suggestion: text });
  };

  const onCreateButtonClick = async () => {
    handleSendMessage({ request_type: "PREDICT", data: { text: input } });
    TrackButtons("PREDICT");
    trackEvent("button_click", { button: "Create" });
  };

  const onSpeakButtonClick = useCallback((text, mood) => {
    const ttsData = Object.keys(ttsParams).reduce((acc, key) => {
      acc[key] = ttsParams[key].value; // Use default values for the TTS request
      return acc;
    }, {});

    console.log(ttsData);

    const requestData = {
      request_type: "SYNTHESISE",
      data: {
        text,
        mood,
        ttsData, // Spread the dynamically configured TTS parameters
        isAdvanced
      },
    };

    socketRef.current.emit('message', JSON.stringify(requestData));
  }, [ttsParams]);

  const handleVoice = (data) => {
    var audio = new Audio(data.audio_url);
    setIsAudioPlaying(true);
    audio.onended = () => setIsAudioPlaying(false);
    audio.play();
  };

  const trackEvent = (eventType, eventData) => {
    const eventMessage = {
      request_type: "EVENT",
      data: {
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
      }
    };
    socketRef.current.emit('message', JSON.stringify(eventMessage));
  };

  return (
    <div className="App">
      <div>
        <ToggleSwitch checked={isAdvanced} onChange={toggleAdvanced} label="Advanced" />
        <ToggleSwitch checked={recordingEnabled} onChange={toggleRecording} label="Recording" />
        <div>
          <div className="inline">
            <input
              readOnly
              value={input}
              placeholder={""}
              onChange={onChangeInput}
              onClick={(e) => e.preventDefault()}
            />
            <Button variant="contained" className="wideButton" onClick={onCreateButtonClick}>Create</Button>
            <Button variant="contained" className="smallButton" onClick={onClearButtonClick}>Clear</Button>
          </div>
          <div className="last-recorded-text-bar">
            <p>{lastRecordedText}</p>
          </div>
          {false ?
            <div className="inline">
              <Button variant="contained" className="wideButton" onClick={() => addSuggestionToInput(autoCompleteSuggestions[0])}>{autoCompleteSuggestions[0]}</Button>
              <Button variant="contained" className="wideButton" onClick={() => addSuggestionToInput(autoCompleteSuggestions[1])}>{autoCompleteSuggestions[1]}</Button>
              <Button variant="contained" className="wideButton" onClick={() => addSuggestionToInput(autoCompleteSuggestions[2])}>{autoCompleteSuggestions[2]}</Button>
            </div>
            : null}
          <div>
            {layoutData && (
              <Keyboard
                keyboardRef={r => (keyboard.current = r)}
                layoutName={layoutName}
                onChange={onChange}
                onKeyPress={onKeyPress}
                layout={layoutData.layout}
              />
            )}
          </div>
        </div>
        <div className="lowerarea">
          <OutputTextHolder outputTextList={outputTextList} setOutputTextList={setOutputTextList} onSpeakButtonClick={onSpeakButtonClick} isAdvanced={isAdvanced} />
          {isAdvanced &&
            <AdvancedControl
              ttsParams={ttsParams}
              setTtsParams={setTtsParams}
              TrackButtons={TrackButtons}
              trackEvent={trackEvent}
            />}
          <AudioRecorder onAudioReady={handleAudioReady} recordingEnabled={recordingEnabled && !isAudioPlaying} setLastRecordedText={setLastRecordedText} />
        </div>
      </div>
    </div>
  );
}

export default App;
