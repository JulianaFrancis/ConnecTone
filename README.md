# ConnecTone

ConnecTone is a modular AAC (Augmentative and Alternative Communication) system prototype that enhances communication through generative text prediction and style-adaptive conversational text-to-speech (TTS). It leverages conversational context and user-specific information to predict speech options, enabling faster, more natural communication for users. The system integrates large language models (LLMs) and conversational TTS to generate expressive and personalized speech. Its modular design allows for rapid testing of innovations, aiming to improve communication tools for AAC users.


# ConnecTone Setup

## Getting Started

Follow these steps to set up the ConnecTone project:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/JulianaFrancis/ConnecTone.git
   ```

2. **Add Environment File**

   Place your `.env` file in the `ConnecTone` folder.
   This should contain an openai key, with variable OPENAI_KEY

4. **Edit Configuration**

   Update the configuration files within the `ConnecTone` folder to include the correct environment variables.
   An example-config.json file is included which should be renamed to config.json after variables are set.

6. **Install Dependencies**

   Navigate to the `eye-gaze-gpt` directory and install the necessary dependencies:

   ```bash
   cd ConnecTone/eye-gaze-gpt/eye-gaze-gpt-main
   npm install
   ```

7. **Start Docker Compose**

   Return to the root `ConnecTone` directory and start the Docker containers:

   ```bash
   cd ../..
   docker compose up
   ```

