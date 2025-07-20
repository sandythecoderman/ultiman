import json
from typing import Iterator, Dict, Any

class DataProcessor:
    """
    Processes the enhanced API JSON file to prepare it for the KAG pipeline.
    """

    def __init__(self, api_file_path: str):
        """
        Initializes the DataProcessor.

        Args:
            api_file_path: The path to the enhanced_apis.json file.
        """
        self.api_file_path = api_file_path

    def process_apis(self) -> Iterator[Dict[str, Any]]:
        """
        Loads the API data, processes it, and yields structured objects for each API.

        This method ignores the 'llm_generated' field and creates two separate
        text fields for embedding as per the plan.

        Yields:
            A dictionary for each API containing the operation_id, the two text
            fields for embedding, and the original API details.
        """
        print(f"Loading and processing APIs from {self.api_file_path}...")
        with open(self.api_file_path, 'r', encoding='utf-8') as f:
            apis = json.load(f)

        for api in apis:
            # Skip if essential details are missing
            if not api.get("details") or not api["details"].get("operationId"):
                continue

            details = api.get("details", {})
            summary = details.get("summary", "")
            description = details.get("description", "")
            additional_info = details.get("additional_info", "")

            # Text source 1: Just the description
            text_for_embedding_1 = description

            # Text source 2: Summary + Additional Info
            text_for_embedding_2 = f"{summary}\n{additional_info}".strip()

            yield {
                "operation_id": details["operationId"],
                "text_for_embedding_1": text_for_embedding_1,
                "text_for_embedding_2": text_for_embedding_2,
                "full_api_details": api
            }

# Example Usage:
# if __name__ == '__main__':
#     # Assuming 'data/enhanced_apis.json' exists relative to the execution path
#     processor = DataProcessor(api_file_path='../../data/enhanced_apis.json')
#     for processed_api in processor.process_apis():
#         print(f"Processing API: {processed_api['operation_id']}")
#         print(f"  Text 1: {processed_api['text_for_embedding_1'][:80]}...")
#         print(f"  Text 2: {processed_api['text_for_embedding_2'][:80]}...")
#         print("-" * 20)