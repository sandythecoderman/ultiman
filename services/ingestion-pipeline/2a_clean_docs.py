import os
import json
import re

# --- Constants ---
DATA_DIR = "data"
ENRICHED_DOCS_FILE = os.path.join(DATA_DIR, "enriched_user_guide.json")

# List of regex patterns to find and remove.
# This pattern is now more specific to the observed text.
CLEANING_PATTERNS = [
    re.compile(r"EIMS\s*©\s*Copyrights\s*reserved\.", re.UNICODE),
    re.compile(r"Page \d+ of \d+", re.IGNORECASE),
    # This pattern can be used to find floating page numbers, etc.
    # re.compile(r"^\s*\d+\s*$") 
]

def clean_text(text: str) -> str:
    """Applies a series of cleaning patterns to a string."""
    for pattern in CLEANING_PATTERNS:
        text = pattern.sub("", text)
    
    # Replace multiple whitespace characters with a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    """
    Main function to load, clean, and save the document data.
    """
    print("--- Starting Step 2a: Clean Enriched Docs ---")

    # Check if the input file exists
    if not os.path.exists(ENRICHED_DOCS_FILE):
        print(f"Error: Input file not found at {ENRICHED_DOCS_FILE}")
        print("Please run the document enrichment step first.")
        return

    print(f"Loading data from {ENRICHED_DOCS_FILE}...")
    with open(ENRICHED_DOCS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("Error: Expected a list of objects in the JSON file.")
        return
        
    cleaned_count = 0
    # Iterate over each document chunk and clean its text
    for item in data:
        if 'original_chunk' in item and isinstance(item['original_chunk'], str):
            original_text = item['original_chunk']
            cleaned_text = clean_text(original_text)
            if original_text != cleaned_text:
                item['original_chunk'] = cleaned_text
                cleaned_count += 1

    print(f"Cleaned {cleaned_count} out of {len(data)} document chunks.")

    # Save the cleaned data back to the same file
    print(f"Saving cleaned data back to {ENRICHED_DOCS_FILE}...")
    with open(ENRICHED_DOCS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print("--- Step 2a: Clean Enriched Docs Complete ---")

if __name__ == "__main__":
    main() 