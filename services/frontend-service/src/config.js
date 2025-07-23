const API_BASE_URL = 'http://localhost:8000';
const CHAT_ENDPOINT = `${API_BASE_URL}/chat`;
const WORKFLOW_GENERATE_ENDPOINT = `${API_BASE_URL}/chat`; // Should also point to chat
const KNOWLEDGE_GRAPH_ENDPOINT = `${API_BASE_URL}/knowledge_graph`;
const FILE_UPLOAD_ENDPOINT = `${API_BASE_URL}/uploadfile/`;

export {
  API_BASE_URL,
  CHAT_ENDPOINT,
  WORKFLOW_GENERATE_ENDPOINT,
  KNOWLEDGE_GRAPH_ENDPOINT,
  FILE_UPLOAD_ENDPOINT,
}; 