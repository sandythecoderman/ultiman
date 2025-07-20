# Unified Orchestrator Agent: Architecture & Data Models

This document outlines the core data structures for the Unified Orchestrator Agent. These models will be implemented as Python classes, likely using `dataclasses` for simplicity and clarity.

## 1. Core Agent Components

The agent will be composed of several key modules, each with a specific responsibility.

-   **`UnifiedOrchestratorAgent`**: The main class that orchestrates the entire process. It takes a high-level user query and returns the final structured output.
-   **`TaskDecomposer`**: Responsible for breaking down the initial user query into a list of logical `SubTask` objects.
-   **`Planner`**: For each `SubTask`, this module uses the RAG and AAG pipelines to create a detailed `ExecutionPlan`.
-   **`Executor`**: Executes the `ExecutionPlan`, making API calls and handling retries or alternative plans.
-   **`ResponseGenerator`**: Formats the final output into the required JSON and natural language text.

## 2. Primary Data Models

### SubTask

A `SubTask` represents a single, actionable part of the user's original query.

```python
# from dataclasses import dataclass

# @dataclass
class SubTask:
    original_query: str  # The user's full, original query
    description: str     # A description of this specific sub-task (e.g., "Create a new user named 'John Doe'")
    status: str          # e.g., 'pending', 'in_progress', 'completed', 'failed'
    result: str          # The outcome or result of this sub-task
```

### ExecutionStep

An `ExecutionStep` represents a single API call within a larger plan.

```python
# from dataclasses import dataclass
# from typing import Dict, Any

# @dataclass
class ExecutionStep:
    api_operation_id: str # The operationId of the API to be called
    reasoning: str          # Why this API was chosen for this step
    parameters: Dict[str, Any] # The parameters to be sent with the API call
    api_details: Dict[str, Any] # Full details of the API endpoint for context
    status: str             # e.g., 'pending', 'completed', 'failed'
    result: Any             # The response from the API call
```

### ExecutionPlan

An `ExecutionPlan` is a sequence of `ExecutionStep` objects required to complete a `SubTask`.

```python
# from dataclasses import dataclass
# from typing import List

# @dataclass
class ExecutionPlan:
    sub_task: SubTask
    steps: List[ExecutionStep]
    estimated_cost: float # Optional: for tracking token usage or API costs
```

## 3. Output Data Models

### JSONOutputNode

This model represents a single node in the final visual pipeline JSON output.

```python
# from dataclasses import dataclass
# from typing import Dict, Any, List

# @dataclass
class JSONOutputNode:
    node_id: str
    operation_id: str
    description: str
    reasoning: str
    parameters: Dict[str, Any]
    dependencies: List[str] # List of node_ids this node depends on
```

### FinalOutput

This is the top-level object that will be returned by the agent.

```python
# from dataclasses import dataclass
# from typing import List, Dict

# @dataclass
class FinalOutput:
    summary_text: str
    visual_pipeline: Dict[str, List[JSONOutputNode]]