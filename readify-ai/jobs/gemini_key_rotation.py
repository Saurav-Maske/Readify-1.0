import os
import google.generativeai as genai


class GeminiKeyRotator:
    """
    Tries GEMINI_API_KEY_1 through GEMINI_API_KEY_N in order. On a failure
    (rate limit, quota exhausted, invalid key), moves to the next one
    silently. Only raises an error if EVERY key has been exhausted.

    .env setup:
        GEMINI_API_KEY_1=...
        GEMINI_API_KEY_2=...
        GEMINI_API_KEY_3=...
        ... up to as many keys as you have
    """
    def __init__(self, model_name="gemini-3.1-flash-lite", key_prefix="GEMINI_API_KEY"):
        self.keys = []
        i = 1
        while True:
            key = os.environ.get(f"{key_prefix}{i}")
            if not key:
                break
            self.keys.append(key)
            i += 1

        if not self.keys:
            raise RuntimeError(
                f"No keys found. Expected env vars like {key_prefix}1, {key_prefix}2, ..."
            )

        self.model_name = model_name
        self.current_index = 0

    def _get_model(self, key):
        genai.configure(api_key=key)
        return genai.GenerativeModel(self.model_name)

    def generate_content(self, prompt):
        errors = []
        n = len(self.keys)
        for attempt in range(n):
            idx = (self.current_index + attempt) % n
            key = self.keys[idx]
            try:
                model = self._get_model(key)
                response = model.generate_content(prompt)
                self.current_index = idx  # stick with the working key next time
                return response
            except Exception as e:
                errors.append(f"key{idx+1}: {e}")
                continue  # try the next key

        # every key failed
        raise RuntimeError(
            f"All {n} Gemini API keys failed. Errors:\n" + "\n".join(errors)
        )