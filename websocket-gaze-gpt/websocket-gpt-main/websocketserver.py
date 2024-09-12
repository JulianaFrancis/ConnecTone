from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import json
from serverfunctions import *
import logging
import sys

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Set up logging to print to stdout
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger()

logger.info("Server is running...")

@socketio.on('connect')
def handle_connect():
    logger.info("Client connected")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info("Client disconnected")

@socketio.on('message')
def handle_message(message):
    request = json.loads(message)
    request_type = request["request_type"]
    request_data = request["data"]

    logger.info(f"Request type: {request_type}")

    # Route request to appropriate function
    if request_type == "PREDICT":
        response = predict(request_type, request_data)
    elif request_type == "SYNTHESISE":
        response = synthesise(request_type, request_data)
    elif request_type == "AUTOCOMPLETE":
        response = autocorrect(request_type, request_data)
    elif request_type == "AUDIO_DATA":
        response = speech_recognition(request_type, request_data)
    elif request_type == "EVENT":
        response = log_event(request_type, request_data)

    emit('response', json.dumps(response))

if __name__ == '__main__':
    ip = "0.0.0.0"  # Bind to all IPv4 addresses
    port = 8765
    logger.info(f"Websocket hosted on: ws://{ip}:{port}")
    socketio.run(app, host=ip, port=port, allow_unsafe_werkzeug=True, debug=True)
