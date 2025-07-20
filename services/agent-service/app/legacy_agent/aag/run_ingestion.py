import sys
import os

# Add the parent directory to the Python path to allow for relative imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.aag.core.ingestion import IngestionService

def main():
    """
    Main function to run the API ingestion process.
    """
    print("--- Starting KAG Ingestion Verification Script ---")
    
    # The data file is in the root 'data' directory
    # We construct the path relative to this script's location
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    api_file = os.path.join(base_dir, 'data', 'enhanced_apis.json')

    if not os.path.exists(api_file):
        print(f"Error: API file not found at {api_file}")
        return

    print(f"Found API file: {api_file}")

    # Initialize and run the ingestion service
    ingestion_service = IngestionService()
    ingestion_service.ingest_apis(api_file_path=api_file)
    
    print("\n--- Verification ---")
    print("Loading indexes from disk to verify they were saved correctly.")
    
    # Verify by loading the indexes back
    verification_service = IngestionService()
    try:
        verification_service.load_indexes()
        print("Verification successful: Indexes and metadata loaded.")
        print(f"Description Index has {verification_service.index1.ntotal} entries.")
        print(f"Summary/Info Index has {verification_service.index2.ntotal} entries.")
    except Exception as e:
        print(f"An error occurred during verification: {e}")

    print("\n--- Ingestion Script Finished ---")

if __name__ == '__main__':
    main()