import speech_recognition as sr
import pyttsx3
import time

from agents.voice_assistant_agent import (
    VoiceAssistantAgent
)


# =====================================================
# INIT
# =====================================================

agent = VoiceAssistantAgent()

recognizer = sr.Recognizer()

microphone = sr.Microphone()

engine = pyttsx3.init()

engine.setProperty("rate", 170)

engine.setProperty("volume", 1.0)

USER_ID = 1

WAKE_WORDS = [

    "jarvis",
    "assistant",
    "hello assistant",
    "hey assistant"
]


# =====================================================
# SPEAK
# =====================================================

def speak(text):

    print(f"\n🤖 Assistant: {text}\n")

    engine.say(text)

    engine.runAndWait()


# =====================================================
# LISTEN
# =====================================================

def listen():

    try:

        with microphone as source:

            print("🎤 Listening...")

            recognizer.adjust_for_ambient_noise(

                source,

                duration=1
            )

            audio = recognizer.listen(

                source,

                timeout=10,

                phrase_time_limit=10
            )

        text = recognizer.recognize_google(

            audio
        )

        print(f"🧑 You: {text}")

        return text.lower()

    except sr.UnknownValueError:

        return ""

    except Exception as e:

        print("Listen Error:", e)

        return ""


# =====================================================
# WAKE WORD
# =====================================================

def wake_word_detected(text):

    for word in WAKE_WORDS:

        if word in text:

            return True

    return False


# =====================================================
# MAIN LOOP
# =====================================================

def run_voice_assistant():

    speak(
        "Voice assistant started."
    )

    while True:

        text = listen()

        if not text:

            continue

        # =============================================
        # EXIT
        # =============================================

        if (

            "exit" in text
            or
            "shutdown" in text
            or
            "stop assistant" in text
        ):

            speak("Goodbye.")

            break

        # =============================================
        # WAKE WORD
        # =============================================

        if wake_word_detected(text):

            speak(
                "Yes, I am listening."
            )

            command = listen()

            if not command:

                speak(
                    "I did not hear anything."
                )

                continue

            # =========================================
            # PROCESS THROUGH AGENT
            # =========================================

            response = agent.route_request(

                user_id=USER_ID,

                text=command
            )

            speak(response)

            time.sleep(0.5)


# =====================================================
# START
# =====================================================

if __name__ == "__main__":

    run_voice_assistant()
    