
import { Button, Paper, Box } from "@mui/material";
import { useState } from "react";


function OutputText({text, setOutputTextList, onSpeakButtonClick, isAdvanced, id}) {

    const [classes, setClasses] = useState(["wideButtonNoHeight","wideButtonNoHeight","wideButtonNoHeight"])

    const renderBG = () => {
        if (id === "1") {

            return "inline SpeakableText greyBG"
        }
        else {
            return "inline SpeakableText"

        }
    }


    const isButtonDisabled = () => {
        if (text[id].text === "") {
            return true
        }
        else {
            return false
        }
    }

    const callPlayAudio = () => {
        onSpeakButtonClick(text[id].text, text[id].mood)
    }

    const textToShow = () => {
        if (text[id].text === "") {
            return "                           "
        }
        else {
            return text[id].text
        }
    }

    const getSelectedButton = (buttonText) => {
        if (buttonText === text[id].mood) {
            return "wideButtonNoHeight selectedMoodButton"
        }
        else {
            return "wideButtonNoHeight"
        }
    }


    const setMood = (mood) => {
        text[id].mood =mood
        setOutputTextList(text)
        setClasses([
            getSelectedButton("conversation"),
            getSelectedButton("mixed"),
            getSelectedButton("reading")
        ])
    }

    return (
    <Paper className={renderBG()}>
      <Box className="TextBox" style={{ minWidth: "70%", whiteSpace: "pre"}}>
        <p>
          {textToShow()}
        </p>
        {!isAdvanced && (
            <div className="inline moodButtons"  >
            <Button variant="contained" className={classes[0]} onClick={()=> {setMood("conversation")}}>Conversation</Button>
            <Button variant="contained" className={classes[1]}  onClick={()=> {setMood("mixed")}}>Mixed</Button>
            <Button variant="contained" className={classes[2]}  onClick={()=> {setMood("reading")}}>Reading</Button>
          </div>
        )}
        
      </Box>
      <Button variant="contained" className="wideButton" style={{ width: "30%" }} disabled={isButtonDisabled()} onClick={callPlayAudio}>Speak</Button>
    </Paper>
    )
  }

  export default OutputText