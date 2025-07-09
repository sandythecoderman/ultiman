import logging
import asyncio
import time
import os
import re
from typing import Dict, List, Optional, Any
from google.cloud import aiplatform
from google.auth import default
import vertexai
from vertexai.generative_models import GenerativeModel

from ..models.agent_models import (
    AgentSession, ReasoningStep, ToolResult, 
    HallucinationAlert, ToolExecutionContext
)

logger = logging.getLogger(__name__)

class HallucinationDetector:
    """Detects potential hallucination in LLM responses"""
    
    HALLUCINATION_PATTERNS = [
        r'ANNC-\d{4}-\d{3}',  # Fake announcement IDs
        r'TICKET-\d{4}-\d{6}',  # Fake ticket IDs
        r'USER-\d{6}',  # Fake user IDs
        r'SRV-\d{4}-\d{3}',  # Fake service IDs
        r'2023-\d{2}-\d{2}',  # Old dates (likely fake)
        r'2022-\d{2}-\d{2}',  # Old dates (likely fake)
    ]
    
    SUSPICIOUS_PHRASES = [
        "as an example",
        "for demonstration",
        "sample data",
        "fictional",
        "hypothetical",
        "let me create",
        "I'll generate"
    ]
    
    @classmethod
    def detect_hallucination(cls, content: str, session_id: str) -> Optional[HallucinationAlert]:
        """Detect potential hallucination in content"""
        
        # Check for suspicious patterns
        for pattern in cls.HALLUCINATION_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return HallucinationAlert(
                    session_id=session_id,
                    detected_content=content[:200],
                    detection_reason=f"Suspicious pattern detected: {pattern}",
                    confidence_score=0.8
                )
        
        # Check for suspicious phrases
        content_lower = content.lower()
        for phrase in cls.SUSPICIOUS_PHRASES:
            if phrase in content_lower:
                return HallucinationAlert(
                    session_id=session_id,
                    detected_content=content[:200],
                    detection_reason=f"Suspicious phrase detected: {phrase}",
                    confidence_score=0.6
                )
        
        return None

class AgentOrchestrator:
    """Main orchestrator for the agentic pipeline using ReAct methodology"""
    
    def __init__(self):
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'ultiman')
        self.location = "us-central1"
        self.model_name = "gemini-2.5-flash"  # Using Gemini 2.5 Flash
        self.max_iterations = int(os.getenv('MAX_ITERATIONS', '5'))
        self.batch_size = int(os.getenv('TOKEN_BATCH_SIZE', '5000'))
        self.enable_hallucination_detection = os.getenv('ENABLE_HALLUCINATION_DETECTION', 'true').lower() == 'true'
        
        # Initialize tools
        self.tools = {}
        
        # Initialize Vertex AI
        self._initialize_vertex_ai()
        
        # Register tools
        self._register_tools()
        
        logger.info(f"🤖 AgentOrchestrator initialized with model: {self.model_name}")
        
        # Anti-hallucination patterns
        self.hallucination_patterns = [
            r'ANNC-\d{4}-\d{3}',  # Fake announcement IDs
            r'TICK-\d{4}-\d{6}',  # Fake ticket IDs  
            r'SVC-\d{4}-\d{3}',   # Fake service IDs
            r'ALT-\d{4}-\d{6}',   # Fake alert IDs
            r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',  # Future dates
            r'definitely confirmed',  # Suspicious certainty phrases
            r'I can see in the database',
            r'according to the latest update'
        ]
    
    def _initialize_vertex_ai(self):
        """Initialize Vertex AI with proper authentication"""
        try:
            # Set up credentials path
            creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '../../Ultiman-cred.json')
            if creds_path and os.path.exists(creds_path):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path
            
            # Initialize Vertex AI
            vertexai.init(project=self.project_id, location=self.location)
            
            # Initialize the model
            self.model = GenerativeModel(self.model_name)
            
            logger.info(f"✅ Vertex AI initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Vertex AI: {str(e)}")
            raise
    
    def _register_tools(self):
        """Register all available tools"""
        try:
            # Import and register Infraon API Caller
            from ..tools.infraon_api_caller import InfraonApiCaller
            self.register_tool("InfraonApiCaller", InfraonApiCaller())
            
            # Import and register Knowledge Graph Querier
            from ..tools.knowledge_graph_querier import KnowledgeGraphQuerier
            self.register_tool("KnowledgeGraphQuerier", KnowledgeGraphQuerier())
            
            # Import and register Vector Store Querier
            from ..tools.vector_store_querier import VectorStoreQuerier
            self.register_tool("VectorStoreQuerier", VectorStoreQuerier())
            
            logger.info(f"✅ All tools registered successfully: {list(self.tools.keys())}")
            
        except Exception as e:
            logger.error(f"❌ Failed to register tools: {str(e)}")
            # Continue without tools rather than crashing
    
    def register_tool(self, name: str, tool_instance):
        """Register a tool with the orchestrator"""
        self.tools[name] = tool_instance
        logger.info(f"🔧 Registered tool: {name}")
    
    async def process_query(self, user_query: str, session_id: Optional[str] = None) -> AgentSession:
        """
        Main entry point for processing user queries using ReAct methodology
        """
        session = AgentSession(
            session_id=session_id or f"session-{int(time.time())}",
            user_query=user_query
        )
        
        logger.info(f"🚀 Starting ReAct loop for query: {user_query}")
        
        try:
            # Start the ReAct loop
            final_response = await self._react_loop(session)
            session.complete_session(final_response)
            
            logger.info(f"✅ Query processed successfully. Tools used: {session.tools_used}")
            
        except Exception as e:
            logger.error(f"❌ Error processing query: {str(e)}")
            session.status = "error"
            session.final_response = f"I apologize, but I encountered an error while processing your request: {str(e)}"
        
        return session
    
    async def _react_loop(self, session: AgentSession) -> str:
        """
        Implementation of the ReAct (Reasoning and Acting) loop
        """
        iteration = 0
        context = self._build_initial_context(session.user_query)
        
        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"🔄 ReAct Loop - Iteration {iteration}")
            
            # REASONING: Let the LLM think about what to do next
            thought_prompt = self._build_thought_prompt(session, context)
            thought_response = await self._call_llm(thought_prompt, session.session_id)
            
            session.add_reasoning_step("thought", thought_response)
            
            # Parse the thought to determine next action
            action_decision = self._parse_action_decision(thought_response, session.user_query)
            
            if action_decision["type"] == "final_answer":
                # LLM has decided it has enough information to answer
                final_prompt = self._build_final_answer_prompt(session, context)
                final_response = await self._call_llm(final_prompt, session.session_id)
                
                session.add_reasoning_step("final_answer", final_response)
                return final_response
            
            elif action_decision["type"] == "use_tool":
                # LLM wants to use a tool
                tool_name = action_decision["tool"]
                tool_params = action_decision["parameters"]
                
                # Enhance tool parameters with context from user query
                enhanced_params = self._enhance_tool_parameters(tool_params, session.user_query)
                
                # Execute the tool
                tool_result = await self._execute_tool(tool_name, enhanced_params, session)
                
                # Add the action and observation to the session
                session.add_reasoning_step(
                    "action", 
                    f"Using tool: {tool_name} with parameters: {tool_params}",
                    tool_used=tool_name,
                    tool_result=tool_result
                )
                
                session.add_reasoning_step(
                    "observation",
                    f"Tool result: {tool_result.data if tool_result.success else tool_result.error}"
                )
                
                # Update context with new information
                context += f"\n\nTool {tool_name} returned: {tool_result.data if tool_result.success else tool_result.error}"
        
        # If we've reached max iterations, provide a response based on what we have
        final_prompt = self._build_final_answer_prompt(session, context)
        final_response = await self._call_llm(final_prompt, session.session_id)
        
        session.add_reasoning_step("final_answer", final_response)
        return final_response
    
    def _build_initial_context(self, user_query: str) -> str:
        """Build the initial context for the conversation"""
        available_tools = ", ".join(self.tools.keys()) if self.tools else "No tools available yet"
        
        return f"""
        You are an AI assistant for the Infraon Infinity Platform. You help users get information and perform tasks.
        
        CRITICAL ANTI-HALLUCINATION RULES:
        1. NEVER generate fictional data, IDs, dates, or examples
        2. If no real data is found, explicitly state "No data found" 
        3. ONLY use data returned by tools - do not create sample data
        4. If you don't have enough information, ask for clarification or use tools to get real data
        5. NEVER use dates from 2022-2023 unless they come from actual tool results
        
        Available tools: {available_tools}
        
        User Query: {user_query}
        """
    
    def _build_thought_prompt(self, session: AgentSession, context: str) -> str:
        """Build the prompt for the reasoning/thinking step"""
        
        conversation_history = self._format_conversation_history(session)
        
        return f"""
        {context}
        
        Conversation so far:
        {conversation_history}
        
        Think step by step about what you need to do to answer the user's query.
        
        You can either:
        1. Use a tool if you need more information
        2. Provide a final answer if you have enough information
        
        Available tools: {", ".join(self.tools.keys()) if self.tools else "None"}
        
        Think about your next action. What do you need to do?
        
        Respond in this format:
        THOUGHT: [your reasoning]
        ACTION: [either "use_tool: tool_name" or "final_answer"]
        """
    
    def _build_final_answer_prompt(self, session: AgentSession, context: str) -> str:
        """Build the prompt for generating the final answer"""
        
        conversation_history = self._format_conversation_history(session)
        
        return f"""
        {context}
        
        Conversation and tool results:
        {conversation_history}
        
        Based on the above information, provide a comprehensive and helpful answer to the user's query.
        
        CRITICAL: Only use real data from tool results. Do not generate fictional examples.
        
        User Query: {session.user_query}
        
        Your Response:
        """
    
    def _format_conversation_history(self, session: AgentSession) -> str:
        """Format the conversation history for inclusion in prompts"""
        history = []
        
        for step in session.reasoning_steps:
            if step.step_type == "thought":
                history.append(f"THOUGHT: {step.content}")
            elif step.step_type == "action":
                history.append(f"ACTION: {step.content}")
            elif step.step_type == "observation":
                history.append(f"OBSERVATION: {step.content}")
        
        return "\n".join(history)
    
    def _parse_action_decision(self, thought_response: str, user_query: str = "") -> Dict[str, Any]:
        """Parse the LLM's thought response to determine the next action"""
        
        thought_lower = thought_response.lower()
        
        # Check for explicit final answer decision
        if "final_answer" in thought_lower or "final answer" in thought_lower:
            return {"type": "final_answer"}
        
        # Look for specific tool usage patterns
        if "infraon" in thought_lower or "api" in thought_lower or "announcement" in thought_lower or "ticket" in thought_lower:
            # Determine specific endpoint based on context
            endpoint = "announcements"  # default
            method = "GET"  # default
            data = None
            
            if "ticket" in thought_lower:
                endpoint = "tickets"
            elif "service" in thought_lower:
                endpoint = "services"
            elif "alert" in thought_lower:
                endpoint = "alerts"
            
            # Detect creation requests
            if any(word in thought_lower for word in ["create", "add", "new", "make", "post"]):
                method = "POST"
                
                # Extract data from user query for creation
                if "announcement" in thought_lower:
                    data = self._extract_announcement_data(user_query)
            
            return {
                "type": "use_tool",
                "tool": "InfraonApiCaller",
                "parameters": {
                    "endpoint": endpoint,
                    "method": method,
                    "data": data
                }
            }
        
        if "knowledge" in thought_lower or "graph" in thought_lower or "relationship" in thought_lower:
            # Determine query type based on context
            query_type = "find_entity"  # default
            if "relationship" in thought_lower or "connect" in thought_lower:
                query_type = "find_relationships"
            elif "announcement" in thought_lower:
                query_type = "search_announcements"
            elif "service" in thought_lower:
                query_type = "search_services"
            
            return {
                "type": "use_tool",
                "tool": "KnowledgeGraphQuerier",
                "parameters": {"query_type": query_type}
            }
        
        if "search" in thought_lower or "document" in thought_lower or "manual" in thought_lower or "help" in thought_lower:
            # Determine vector store based on context
            vector_store = "api_documentation"  # default
            if "manual" in thought_lower or "tutorial" in thought_lower:
                vector_store = "user_manuals"
            elif "troubleshoot" in thought_lower or "problem" in thought_lower or "error" in thought_lower:
                vector_store = "troubleshooting"
            
            return {
                "type": "use_tool",
                "tool": "VectorStoreQuerier",
                "parameters": {"vector_store": vector_store}
            }
        
        # Look for any tool mention by name
        for tool_name in self.tools.keys():
            if tool_name.lower() in thought_lower:
                return {
                    "type": "use_tool",
                    "tool": tool_name,
                    "parameters": {}
                }
        
        # If still no decision, check if we have some tools available and the query needs more info
        if self.tools and any(keyword in thought_lower for keyword in ["need", "search", "find", "get", "check", "look"]):
            # Default to Infraon API for getting basic information
            return {
                "type": "use_tool",
                "tool": "InfraonApiCaller",
                "parameters": {"endpoint": "announcements"}
            }
        
        # Default to final answer
        return {"type": "final_answer"}
    
    def _extract_announcement_data(self, user_query: str) -> Dict[str, Any]:
        """Extract announcement data from user query for creation"""
        import re
        
        # Extract title from quotes or common patterns
        title_patterns = [
            r'title\s*["\']([^"\']+)["\']',
            r'with\s+title\s*["\']([^"\']+)["\']',
            r'called\s*["\']([^"\']+)["\']',
            r'titled\s*["\']([^"\']+)["\']'
        ]
        
        title = None
        for pattern in title_patterns:
            match = re.search(pattern, user_query, re.IGNORECASE)
            if match:
                title = match.group(1)
                break
        
        # Extract message from quotes or common patterns  
        message_patterns = [
            r'message\s*["\']([^"\']+)["\']',
            r'with\s+message\s*["\']([^"\']+)["\']',
            r'saying\s*["\']([^"\']+)["\']',
            r'content\s*["\']([^"\']+)["\']'
        ]
        
        message = None
        for pattern in message_patterns:
            match = re.search(pattern, user_query, re.IGNORECASE)
            if match:
                message = match.group(1)
                break
        
        # Default values if not found
        if not title:
            title = "New Announcement"
        if not message:
            message = "Announcement created by AI Agent"
        
        return {
            "title": title,
            "message": message,
            "priority": "medium",
            "status": "active"
        }
    
    def _enhance_tool_parameters(self, base_params: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Enhance tool parameters with information extracted from user query"""
        
        enhanced_params = base_params.copy()
        query_lower = user_query.lower()
        
        # Extract search terms for tools that need them
        if "KnowledgeGraphQuerier" in str(base_params) or "search_term" not in enhanced_params:
            # Look for entities or search terms in the query
            search_keywords = []
            
            # Extract quoted terms
            import re
            quoted_terms = re.findall(r'"([^"]*)"', user_query)
            search_keywords.extend(quoted_terms)
            
            # Extract key terms (avoiding common words)
            stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "when", "where", "why", "who", "get", "show", "tell", "me", "about"}
            words = [word.strip(".,!?;") for word in user_query.lower().split()]
            key_words = [word for word in words if len(word) > 2 and word not in stop_words]
            
            if quoted_terms:
                enhanced_params["search_term"] = quoted_terms[0]
            elif key_words:
                enhanced_params["search_term"] = " ".join(key_words[:3])  # Use first 3 key words
            else:
                enhanced_params["search_term"] = user_query[:50]  # Fallback to truncated query
        
        # For vector store queries, add the query as search term
        if "VectorStoreQuerier" in str(base_params) and "query" not in enhanced_params:
            enhanced_params["query"] = user_query
        
        # Set reasonable defaults
        if "top_k" not in enhanced_params:
            enhanced_params["top_k"] = 5
        
        if "limit" not in enhanced_params:
            enhanced_params["limit"] = 10
        
        return enhanced_params
    
    async def _execute_tool(self, tool_name: str, parameters: Dict[str, Any], session: AgentSession) -> ToolResult:
        """Execute a tool and return the result"""
        
        start_time = time.time()
        
        try:
            if tool_name not in self.tools:
                return ToolResult(
                    tool_name=tool_name,
                    success=False,
                    error=f"Tool '{tool_name}' not found",
                    execution_time=time.time() - start_time
                )
            
            tool = self.tools[tool_name]
            
            # Create execution context
            context = ToolExecutionContext(
                session_id=session.session_id,
                user_query=session.user_query,
                previous_results=[step.tool_result for step in session.reasoning_steps if step.tool_result]
            )
            
            # Execute the tool
            result_data = await tool.execute(parameters, context)
            
            return ToolResult(
                tool_name=tool_name,
                success=True,
                data=result_data,
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            logger.error(f"❌ Tool execution failed for {tool_name}: {str(e)}")
            
            return ToolResult(
                tool_name=tool_name,
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    async def _call_llm(self, prompt: str, session_id: str) -> str:
        """Call the Gemini 2.5 Flash model with anti-hallucination measures"""
        
        try:
            logger.info(f"🧠 Calling Gemini 2.5 Flash (latest stable)...")
            
            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content, 
                prompt
            )
            
            # Handle Gemini 2.5 Flash response format with multiple content parts
            try:
                # Try to get text directly first
                response_text = response.text
            except Exception as e:
                logger.info(f"📝 Gemini 2.5 Flash returned multiple content parts, extracting...")
                
                # Extract text from multiple parts
                response_parts = []
                if hasattr(response, 'candidates') and len(response.candidates) > 0:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                response_parts.append(part.text)
                
                if response_parts:
                    response_text = " ".join(response_parts)
                else:
                    # Fallback: return the string representation
                    response_text = str(response)
            
            # Check for hallucination if enabled
            if self.enable_hallucination_detection:
                hallucination_alert = HallucinationDetector.detect_hallucination(response_text, session_id)
                if hallucination_alert:
                    logger.warning(f"⚠️ Potential hallucination detected: {hallucination_alert.detection_reason}")
                    # Could implement retry logic here or flag for human review
            
            logger.info(f"✅ LLM response generated successfully")
            return response_text
            
        except Exception as e:
            logger.error(f"❌ LLM call failed: {str(e)}")
            raise 