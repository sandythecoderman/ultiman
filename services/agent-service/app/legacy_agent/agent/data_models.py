from dataclasses import dataclass, field
from typing import Dict, Any, List

@dataclass
class SubTask:
    """A SubTask represents a single, actionable part of the user's original query."""
    original_query: str
    description: str
    status: str = "pending"
    result: str = ""

@dataclass
class ExecutionStep:
    """An ExecutionStep represents a single API call within a larger plan."""
    api_operation_id: str
    reasoning: str
    api_details: Dict[str, Any]
    parameters: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"
    result: Any = None

@dataclass
class ExecutionPlan:
    """An ExecutionPlan is a sequence of ExecutionStep objects required to complete a SubTask."""
    sub_task: SubTask
    steps: List[ExecutionStep] = field(default_factory=list)
    estimated_cost: float = 0.0

@dataclass
class JSONOutputNode:
    """This model represents a single node in the final visual pipeline JSON output."""
    node_id: str
    operation_id: str
    description: str
    reasoning: str
    parameters: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)

@dataclass
class FinalOutput:
    """This is the top-level object that will be returned by the agent."""
    summary_text: str
    visual_pipeline: Dict[str, List[JSONOutputNode]]