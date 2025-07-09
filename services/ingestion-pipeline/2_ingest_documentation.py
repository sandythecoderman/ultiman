import os
import json
import fitz  # PyMuPDF
import vertexai
from vertexai.generative_models import GenerativeModel
from google.oauth2 import service_account
from google.auth.exceptions import DefaultCredentialsError

def get_vertex_credentials():
    """
    Loads Google Cloud credentials from the specified service account JSON file.
    """
    credentials_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Ultiman-cred.json')
    if not os.path.exists(credentials_path):
        raise FileNotFoundError(
            f"Service account file not found at {credentials_path}. "
            "Please ensure 'Ultiman-cred.json' is in the project root."
        )
    
    try:
        return service_account.Credentials.from_service_account_file(credentials_path)
    except Exception as e:
        raise RuntimeError(f"Error loading credentials from {credentials_path}: {e}")

def extract_text_from_pdf(pdf_path):
    """
    Extracts text from a PDF, returning both chunks and the full text.
    """
    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    chunks = []
    full_text_list = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        full_text_list.append(text)
        paragraphs = text.strip().split('\n\n')
        cleaned_paragraphs = [p.strip().replace('\n', ' ') for p in paragraphs if p.strip()]
        chunks.extend(cleaned_paragraphs)
    full_text = "\n".join(full_text_list)
    print(f"Extracted {len(chunks)} text chunks from the PDF.")
    return chunks, full_text

def summarize_document(model, full_text):
    """
    Sends the entire document text to Gemini for a detailed summary.
    """
    print("Summarizing the entire document for context...")
    prompt = f"""
    Please read the following entire user guide for the Infraon Infinity platform.
    Provide a detailed summary that outlines the main modules of the platform (like Service Desk, Asset Management, etc.) and their primary purpose, this summary is essential for the AI assistant to understand the platform and its capabilities.
    This summary will be used as context for a more deep and detailed analysis.
    Use as many words as needed to describe the platform and its capabilities.
 
    Full Document Text:
    ---
    {full_text}
    ---
    """
    try:
        response = model.generate_content(prompt)
        print("Successfully generated document summary.")
        return response.text
    except Exception as e:
        print(f"Error calling Vertex AI API for summarization: {e}")
        return None

def load_and_format_api_spec():
    """
    Loads the raw API spec and formats it for inclusion in the prompt.
    """
    print("Loading and formatting API specification...")
    api_spec_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw_api_spec.json')
    try:
        with open(api_spec_path, 'r') as f:
            api_data = json.load(f)
        
        # Format for readability in the prompt
        formatted_apis = [f"- {d['method']} {d['path']} ({d.get('summary', 'No summary')})" for d in api_data]
        return "\n".join(formatted_apis)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Could not load or parse raw_api_spec.json: {e}")
        return ""

def build_full_prompt(document_summary, api_spec_summary, text_chunk):
    """
    Builds the rich prompt with full context for chunk analysis.
    """
    return f"""
    You are an expert AI data analyst tasked with building a knowledge graph for "Ultiman," an AI assistant.
    Your goal is to extract structured information from the Infraon Infinity user guide to help Ultiman understand the platform's capabilities and guide users.

    **Overall Context:**

    1.  **Project Goal:** To create a knowledge base (a graph database and a vector DB) that maps out the functionalities of the Infraon Infinity platform. This will allow an AI assistant to answer user questions and automate tasks.

    2.  **Infraon Documentation Summary:**
        ---
        {document_summary}
        ---

    3.  **Available API Endpoints:** The assistant will eventually use these APIs. Your analysis should connect the documentation to these capabilities. Here is a summary of the available APIs:
        ---
        {api_spec_summary}
        ---

    **Your Task:**

    Analyze the following specific text chunk from the user guide. Based on ALL the context provided above, extract the key information.

    **Text Chunk to Analyze:**
    ---
    {text_chunk}
    ---

    **Required Output:**
    Return a single, valid JSON object with the following keys:
    - "mentioned_modules": A list of strings. List the primary Infraon Modules this chunk discusses (e.g., "Service Desk", "Asset Management", "Monitoring").
    - "mentioned_features": A list of strings. List the specific features or concepts described (e.g., "Creating a Ticket", "SLA Timers", "Device Discovery").
    - "summary": A concise, one-sentence summary of what the user can DO or LEARN from this chunk.
    - "related_apis": A list of strings. If this chunk describes a function that clearly maps to one of the API endpoints listed in the context, list the full API path(s) here (e.g., "POST /ux/sd/task/"). Infer this connection logically. If no direct connection is obvious, return an empty list.
    """

def enrich_chunk_with_vertex_ai(model, prompt):
    """
    Sends a text chunk to Vertex AI Gemini 2.5 Flash for analysis and enrichment.
    """
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().lstrip("```json").rstrip("```")
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"Error calling Vertex AI API or parsing JSON: {e}")
        return None

def ingest_documentation():
    """
    Main function to orchestrate the documentation ingestion pipeline using Vertex AI.
    """
    project_id = "ultiman"
    location = "us-central1"
    model_name = "gemini-2.5-flash"

    try:
        credentials = get_vertex_credentials()
        vertexai.init(project=project_id, location=location, credentials=credentials)
        model = GenerativeModel(model_name)
    except (FileNotFoundError, RuntimeError, DefaultCredentialsError, Exception) as e:
        print(f"Error during Vertex AI initialization: {e}")
        return

    pdf_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'infraon-user-guide.pdf')
    output_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'enriched_user_guide.json')

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return

    text_chunks, full_text = extract_text_from_pdf(pdf_path)
    
    document_summary = summarize_document(model, full_text)
    if not document_summary:
        print("Could not generate document summary. Aborting.")
        return

    api_spec_summary = load_and_format_api_spec()

    enriched_data = []
    for i, chunk in enumerate(text_chunks):
        print(f"Processing chunk {i+1}/{len(text_chunks)}...")
        
        full_prompt = build_full_prompt(document_summary, api_spec_summary, chunk)
        
        enrichment = enrich_chunk_with_vertex_ai(model, full_prompt)
        if enrichment:
            enriched_data.append({
                'original_chunk': chunk,
                'enrichment': enrichment
            })
        else:
            print(f"Skipping chunk {i+1} due to processing error.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(enriched_data, f, indent=2)

    print(f"\nSuccessfully processed {len(enriched_data)} out of {len(text_chunks)} chunks.")
    print(f"Enriched user guide data saved to: {output_path}")

if __name__ == "__main__":
    ingest_documentation() 