MOCK_WORKFLOW = {
    "nodes": [
        {"id": "gen-1", "position": {"x": 100, "y": 100}, "data": {"label": "Get User Data"}, "type": "input"},
        {"id": "gen-2", "position": {"x": 350, "y": 100}, "data": {"label": "Enrich with CRM Info"}},
        {"id": "gen-3", "position": {"x": 350, "y": 250}, "data": {"label": "Score Lead"}},
        {"id": "gen-4", "position": {"x": 100, "y": 250}, "data": {"label": "Send to Sales"}},
        {"id": "gen-5", "position": {"x": 600, "y": 100}, "data": {"label": "Notify Slack"}, "type": "output"}
    ],
    "edges": [
        {"id": "e-gen-1-2", "source": "gen-1", "target": "gen-2"},
        {"id": "e-gen-2-3", "source": "gen-2", "target": "gen-3"},
        {"id": "e-gen-3-4", "source": "gen-3", "target": "gen-4"},
        {"id": "e-gen-2-5", "source": "gen-2", "target": "gen-5", "animated": True}
    ]
} 