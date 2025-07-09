from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

class ToolResult(BaseModel):
    """Result from a tool execution"""
    tool_name: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float
    timestamp: datetime = Field(default_factory=datetime.now)

class ReasoningStep(BaseModel):
    """A step in the agent's reasoning process"""
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    step_type: str  # "thought", "action", "observation", "final_answer"
    content: str
    tool_used: Optional[str] = None
    tool_result: Optional[ToolResult] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class AgentSession(BaseModel):
    """Represents an agent conversation session"""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_query: str
    reasoning_steps: List[ReasoningStep] = []
    final_response: Optional[str] = None
    tools_used: List[str] = []
    status: str = "processing"  # "processing", "completed", "error"
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    def add_reasoning_step(self, step_type: str, content: str, tool_used: Optional[str] = None, tool_result: Optional[ToolResult] = None):
        """Add a new reasoning step to the session"""
        step = ReasoningStep(
            step_type=step_type,
            content=content,
            tool_used=tool_used,
            tool_result=tool_result
        )
        self.reasoning_steps.append(step)
        
        if tool_used and tool_used not in self.tools_used:
            self.tools_used.append(tool_used)
    
    def complete_session(self, final_response: str):
        """Mark the session as completed"""
        self.final_response = final_response
        self.status = "completed"
        self.completed_at = datetime.now()

class HallucinationAlert(BaseModel):
    """Alert for potential hallucination detection"""
    alert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    detected_content: str
    detection_reason: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.now)

class ToolExecutionContext(BaseModel):
    """Context for tool execution"""
    session_id: str
    user_query: str
    previous_results: List[ToolResult] = []
    max_retries: int = 3
    timeout_seconds: int = 30 