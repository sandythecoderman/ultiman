import json
import requests
from pathlib import Path

# Always resolve config relative to the script's directory
CONFIG_PATH = Path(__file__).resolve().parent / 'rag' / 'config' / 'rag_config.json'

class LLMClient:
    def __init__(self):
        self.agent_map = self._load_agent_config()
        self.api_url = 'https://openrouter.ai/api/v1/chat/completions'

    def _load_agent_config(self):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            agents = json.load(f)
        return {agent['agent_id']: agent for agent in agents}

    def send_prompt(self, agent_id, prompt, system_prompt=None):
        if agent_id not in self.agent_map:
            raise ValueError(f'Agent ID {agent_id} not found in config.')
        agent = self.agent_map[agent_id]
        model_id = agent['model_id']
        api_key = agent.get('openrouter_api_key')
        if not api_key:
            raise ValueError(f'No OpenRouter API key found for agent {agent_id}.')
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model_id,
            "messages": messages
        }
        response = requests.post(self.api_url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f'OpenRouter API error: {response.status_code} {response.text}')
        data = response.json()
        return data['choices'][0]['message']['content']

# Example usage:
# client = LLMClient()
# print(client.send_prompt('agent-001', 'Hello, who are you?')) 