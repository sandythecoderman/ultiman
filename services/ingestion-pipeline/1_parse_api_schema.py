import json
import os

def parse_openapi_spec():
    """
    Parses the OpenAPI specification to extract endpoint details.
    """
    spec_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'infraon-openAPI.json')
    output_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw_api_spec.json')

    print(f"Reading OpenAPI spec from: {spec_path}")

    try:
        with open(spec_path, 'r') as f:
            spec_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: OpenAPI spec file not found at {spec_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {spec_path}")
        return

    extracted_endpoints = []
    
    paths = spec_data.get('paths', {})
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            # We are interested in standard HTTP methods
            if method.lower() in ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']:
                endpoint_details = {
                    'path': path,
                    'method': method.upper(),
                    'summary': operation.get('summary', ''),
                    'description': operation.get('description', ''),
                    'tags': operation.get('tags', [])
                }
                extracted_endpoints.append(endpoint_details)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(extracted_endpoints, f, indent=2)

    print(f"Successfully extracted {len(extracted_endpoints)} endpoints.")
    print(f"Raw API spec saved to: {output_path}")

if __name__ == "__main__":
    parse_openapi_spec() 