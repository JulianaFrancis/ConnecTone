import uuid
import requests
import json
from openai import OpenAI
from dotenv import load_dotenv
import os
import base64
from pydub import AudioSegment
import io
import sqlite3
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import logging
import sys

# Set up logging to print to stdout
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger()

# Load environment variables from .env file
load_dotenv(".env")

# Read the system prompt from a file
with open("SystemPrompt.txt", "r") as file:
    system_prompt = file.read()

# Load config
with open("config/config.json") as config_file:
    config = json.load(config_file)


# Set up the SQLite database
def setup_database():
    """
    Set up the SQLite database and create necessary tables if they don't exist.
    """
    conn = sqlite3.connect("transcriptions.db")
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS transcriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            audio_link TEXT NOT NULL,
            is_synthesized BOOLEAN NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


setup_database()


def save_transcription_to_db(text, audio_link, is_synthesized):
    """
    Save a transcription to the database.
    """
    try:
        conn = sqlite3.connect("transcriptions.db")
        c = conn.cursor()
        c.execute(
            "INSERT INTO transcriptions (text, audio_link, is_synthesized, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
            (
                text,
                audio_link,
                is_synthesized,
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Error saving to database: %s", e)


def save_transcription_segment_to_db(text, start_offset, end_offset, request_time):
    """
    Save a transcription segment to the database.
    """
    try:
        start_time = request_time + timedelta(seconds=start_offset)
        end_time = request_time + timedelta(seconds=end_offset)
        audio_url = ""

        conn = sqlite3.connect("transcriptions.db")
        c = conn.cursor()
        c.execute(
            """
            INSERT INTO transcriptions (text, audio_link, is_synthesized, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (text, audio_url, False, start_time, end_time),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Error saving to database: %s", e)


def transcribe_audio(file_path, request_time):
    """
    Transcribe audio file using a transcription server.
    """
    try:
        url = config["transcriptionServer"]
        files = {"file": open(file_path, "rb")}
        response = requests.post(url, files=files)
        logger.info(response.json())

        if response.status_code == 200:
            transcription_result = response.json()
            logger.info("Transcription result:")
            logger.info(json.dumps(transcription_result, indent=4))

            if (
                "segments" in transcription_result
                and len(transcription_result["segments"]) > 0
            ):
                segments = transcription_result["segments"]
                concatenated_text = ""

                for segment in segments:
                    text = segment.get("text", "")
                    start_time = segment.get("start", 0.0)
                    end_time = segment.get("end", 0.0)

                    if text:
                        save_transcription_segment_to_db(
                            text, start_time, end_time, request_time
                        )
                        concatenated_text += f"{text} "

                # Trim any trailing whitespace and return the concatenated text
                return (
                    concatenated_text.strip()
                    if concatenated_text
                    else "No audible voice."
                )
            else:
                return "No audible voice."
        else:
            logger.error("Error: %s", json.dumps(response.json(), indent=4))
            return f"Error transcribing audio. {response}"
    except Exception as e:
        logger.error("Error during transcription: %s", e)
        return "Error transcribing audio."


def get_last_ten_minutes_transcriptions():
    """
    Retrieve transcriptions from the last ten minutes from the database.
    """
    try:
        conn = sqlite3.connect("transcriptions.db")
        c = conn.cursor()

        now_utc = datetime.now(timezone.utc)
        ten_minutes_ago_utc = now_utc - timedelta(minutes=10)
        ten_minutes_ago_str = ten_minutes_ago_utc.strftime("%Y-%m-%d %H:%M:%S")
        logger.info(ten_minutes_ago_str)

        c.execute(
            """
            SELECT text, is_synthesized FROM transcriptions
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
        """,
            (ten_minutes_ago_str,),
        )

        rows = c.fetchall()
        conn.close()

        transcriptions = []
        for row in rows:
            prefix = "user:" if row[1] else "other:"
            transcriptions.append(f"{prefix} {row[0]}")

        transcription_string = "\n".join(transcriptions)

        if len(transcription_string) > 4000:
            while len(transcription_string) > 4000:
                first_newline_pos = transcription_string.find("\n")
                if first_newline_pos == -1:
                    break
                transcription_string = transcription_string[first_newline_pos + 1 :]
        return transcription_string

    except Exception as e:
        logger.error("Error retrieving transcriptions: %s", e)
        return "Error retrieving transcriptions."


def log_event(event_type, event_data):
    """
    Log an event to the database.
    """
    try:
        conn = sqlite3.connect("transcriptions.db")
        c = conn.cursor()
        c.execute(
            "INSERT INTO events (event_type, event_data, timestamp) VALUES (?, ?, ?)",
            (event_type, json.dumps(event_data), datetime.now(timezone.utc)),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Error saving event to database: %s", e)


def process_audio_data(audio_data):
    """
    Process audio data and save it as a WAV file.
    """
    try:
        missing_padding = len(audio_data) % 4
        if missing_padding != 0:
            audio_data += "=" * (4 - missing_padding)

        audio_data = audio_data.split(",")[1]
        decoded_audio = base64.b64decode(audio_data)

        audio_segment = AudioSegment.from_file(io.BytesIO(decoded_audio), format="webm")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        output_filename = f"audio_{timestamp}_{unique_id}.wav"

        output_directory = "audio_files"
        os.makedirs(output_directory, exist_ok=True)

        output_path = os.path.join(output_directory, output_filename)
        audio_segment.export(output_path, format="wav")

        logger.info("Audio data processed and saved as WAV to: %s", output_path)
        return output_path

    except Exception as e:
        logger.error("Error processing audio data: %s", e)
        return None


import re
import os
from openai import OpenAI


def predict(request_type, data):
    """
    Generate a prediction using OpenAI GPT-4o model.
    """
    text = data["text"]
    temp_system_prompt = system_prompt + get_last_ten_minutes_transcriptions()

    client = OpenAI(api_key=os.getenv("OPENAI_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": temp_system_prompt},
            {"role": "user", "content": text},
        ],
        n=3,
        temperature=1,
    )

    response = {
        "request_type": request_type,
        "data": {
            "options": [
                response.choices[0].message.content,
                response.choices[1].message.content,
                response.choices[2].message.content,
            ]
        },
    }

    return response


def synthesise(request_type, data):
    """
    Synthesize text into speech using a TTS server.
    """
    file_uuid = str(uuid.uuid4())
    tts_url = config["ttsServer"]
    text = data["text"]
    tts_data = data["ttsData"]

    logger.info(data)

    tts_params = config["tts_params"]

    url_params_dict = defaultdict(list)
    for param, details in tts_params.items():
        if param in tts_data:
            url_params_dict[details["url_param"]].append(str(tts_data[param]))

    url_params = [
        f"{key}={','.join(values)}" for key, values in url_params_dict.items()
    ]
    url_params_str = "&".join(url_params)

    def download_wav_to_sound_object(url, fn):
        response = requests.get(url)
        response.raise_for_status()
        with open(fn, "wb") as file:
            file.write(response.content)

    say_string = f'{tts_url}{text}"&{url_params_str}'
    logger.info(say_string)
    download_wav_to_sound_object(say_string, "uploadedfiles/" + file_uuid + ".wav")

    audio_url = f"{config['fileServer']}/uploadedfiles/{file_uuid}.wav"

    save_transcription_to_db(text, audio_url, True)

    response = {"request_type": request_type, "data": {"audio_url": audio_url}}

    return response


def autocorrect(request_type, data):
    """
    Perform autocorrection on input text.
    """
    text = data["input"]
    text_list = str.split(text)

    if text[-1] == " ":
        pass
    else:
        pass
    response = {
        "request_type": request_type,
        "data": {"options": [text + "word 1", text + "word 2", text + "word 3"]},
    }

    return response


def speech_recognition(request_type, data):
    """
    Perform speech recognition on audio data.
    """
    audio_path = process_audio_data(data["audio"])

    if audio_path is None:
        return {
            "request_type": request_type,
            "data": "No speech detected in the audio segment.",
        }

    request_time = datetime.now(timezone.utc)
    transcription = transcribe_audio(audio_path, request_time)
    audio_url = audio_path

    if transcription != "Error transcribing audio.":
        save_transcription_to_db(transcription, audio_url, False)

    print(transcription)
    response = {"request_type": request_type, "data": transcription, "language": "en"}

    return response
