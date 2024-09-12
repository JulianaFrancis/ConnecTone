from flask import Flask, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/config')
def get_config():
    with open('config/config.json') as config_file:
        config = json.load(config_file)
    return jsonify(config)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
