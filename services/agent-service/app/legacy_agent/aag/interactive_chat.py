import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from legacy.aag.aag_pipeline import AAGPipeline

def main():
    """
    Main function to run an interactive chat session with the AAG pipeline.
    """
    print("Initializing AAG Interactive Chat...")
    print("This may take a moment as models and data are loaded.")
    
    try:
        pipeline = AAGPipeline()
    except Exception as e:
        print(f"\nFatal Error: Could not initialize the AAG Pipeline.")
        print(f"Error details: {e}")
        print("Please ensure you have run 'run_ingestion.py' successfully and that all required models are available.")
        return

    print("\nWelcome to the AAG Interactive Chat!")
    print("Type your query to find the best API, or type 'exit' to quit.")
    
    while True:
        try:
            query = input("\nYour Query > ")
            if query.lower().strip() == 'exit':
                print("Exiting chat. Goodbye!")
                break
            
            if not query.strip():
                continue

            result = pipeline.run(query)
            
            print("\n--- Result ---")
            print(f"Final Selected API: {result}")
            print("----------------")

        except KeyboardInterrupt:
            print("\nExiting chat. Goodbye!")
            break
        except Exception as e:
            print(f"\nAn error occurred during the pipeline execution: {e}")
            print("Please try again.")

if __name__ == '__main__':
    main()