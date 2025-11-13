# Agent Tools & Interoperability with MCP - Revision Notes
*Document Overview*: 55-page guide (Nov 2025) by Mike Styer et al. (Google). Second in 5-part series on production-grade AI agents. Focus: Tool design best practices, MCP protocol for standardized integrations, enterprise risks/mitigations. Key themes: Tools as "eyes/hands" (retrieval/execution), MCP client-server model (JSON-RPC), Security challenges (e.g., confused deputy, tool shadowing). Builds on Day 1's architecture.

## Core Concepts
- **Tool Definition**: Function/program extending LLM beyond pattern prediction; enables perception (retrieve data) or action (APIs/code exec). Types: Know something (e.g., weather API) or Do something (e.g., unit conversion).
- **Paradigm Shift**: From isolated models to agentic systems; tools address training data limits. Challenges: Integration complexity ("N x M" problem), security risks (rogue actions/data leaks).
- **MCP Role**: Open standard (Anthropic, Nov 2024) for tool-LLM comms; inspired by LSP. Solves fragmentation via unified protocol; supports dynamic discovery but lacks enterprise security.
- **Developer Shift**: From hardcoding to curating reusable tools; emphasize docs/schemas over APIs.

## Tools and Tool Calling
- **What is a Tool?**: LLM-invocable function with name, params, description. Passed in request context; e.g., Python docstring → schema.
- **Example (Weather Agent)**: Mission ("Weather in Celsius?") → Tools (get_location, get_weather, convert_units) → Loop: Reason → Act → Observe.

## Types of Tools
| Type | Description | Examples | Key Notes |
|------|-------------|----------|-----------|
| **Function Tools** | Developer-defined external functions; schema from docstrings. | set_light_values (brightness/color via API). | Balance params; use ToolContext for state. |
| **Built-in Tools** | Model-native (implicit defs); no code needed. | Gemini: Google Search, Code Exec, URL Context, Computer Use. | Fast; e.g., url_context fetches recipe sites. |
| **Agent Tools** | Invoke sub-agents as tools; maintain control. | AgentTool(capital_agent) for country capitals. | Supports multi-agent; A2A for remote. |

- **Taxonomy by Function**:
  - **Retrieval**: RAG (vector DBs), NL2SQL (analytics queries).
  - **Execution**: APIs (email/schedule), sandbox code (SQL/Python).
  - **HITL**: Pause for user input (e.g., SMS confirmation).
  - **Design Tips**: Clear schemas, context limits, auth/rate handling.

## Best Practices
- **Documentation**: Clear names (e.g., create_critical_bug_in_jira), param types/uses, examples/defaults. Avoid jargon; focus on purpose.
  - Good: Detailed args/returns (e.g., get_product_information with keys like 'status').
  - Bad: Vague (e.g., fetchpd(pid): "Retrieves product data").
- **Actions, Not Implementations**: Instruct "create bug" not "use create_bug tool"; avoid workflow dictation.
- **Publish Tasks, Not APIs**: Encapsulate granular user tasks (e.g., "save_secure_note" vs. raw API); hide complexity.
- **Granular Tools**: Single responsibility; short param lists; doc side effects.
- **Concise Output**: Avoid large data (use DB refs/Artifacts); store externally.
- **Validation**: Use schemas for inputs/outputs; descriptive errors (e.g., "API rate limit: wait 15s").
- **Error Guidance**: Suggest fixes (e.g., "Confirm product ID").

## Model Context Protocol (MCP)
### "N x M" Problem & Need for Standardization
- Explosion: N models × M tools = custom connectors. MCP: Unified interface for plug-and-play.

### Core Components
| Component | Role | Responsibilities |
|-----------|------|------------------|
| **Host** | App managing clients (e.g., multi-agent). | UX, orchestration, security policies. |
| **Client** | Embedded in Host; connects to Server. | Commands, responses, session lifecycle. |
| **Server** | Exposes tools/resources (adapter/proxy). | Discovery, execution, auth/scalability. |

### Communication Layer
- **JSON-RPC 2.0**: Lightweight base; types: Requests/Results/Errors/Notifications.
- **Transports**: stdio (local subprocess), Streamable HTTP (remote, SSE optional).

### Key Primitives
- **Tools**: JSON schema (name/title/desc/inputSchema/outputSchema/annotations). Hints: destructive/idempotent/openWorld/readOnly.
  - Example: get_stock_price (symbol/date → price/date).
- **Tool Results**: Structured (JSON vs. schema), unstructured (text/audio/image base64).
- **Error Handling**: Protocol (e.g., -32602 unknown tool) + tool-specific (isError:true + guidance).
- **Other Capabilities** (Limited Adoption ~30-10%):
  - **Resources**: Contextual data (files/DB records); link/embed; validate from trusted URLs.
  - **Prompts**: Reusable templates/examples; risky (injection); use sparingly.
  - **Sampling**: Server requests LLM call from client; HITL optional; cost/control benefits but injection risks.
  - **Elicitation**: Server queries user data; no sensitive info; consent required.
  - **Roots**: Filesystem boundaries (file: URIs); SHOULD respect but no enforcement.

| Capability | % Client Support (Sep 2025) |
|------------|-----------------------------|
| Tools | 99% |
| Resources | 34% |
| Prompts | 32% |
| Sampling | 10% |
| Elicitation | 4% |
| Roots | 5% |

### For & Against
- **Advantages**:
  - Accelerates dev/reusability (registries like MCP Registry).
  - Dynamic discovery/autonomy; modular (decouples agent-tool impl).
  - Future-proof: RAG-like tool retrieval for scale.
- **Challenges**:
  - Context bloat (all defs in prompt → cost/latency/reasoning degradation).
  - Stateful complexity (vs. stateless REST).
  - Enterprise Gaps: Weak authZ (OAuth conflicts), no identity propagation, observability absent.

## Agent Deployment & Services
- **Infrastructure**: Use Vertex AI Agent Engine (managed) or Docker/Cloud Run/GKE (custom).
- **Services**: Monitoring/logging (e.g., traces), memory persistence; ensure privacy/compliance.

## Agent Ops
- **Metrics-Driven**: KPIs like goal completion/satisfaction/latency/cost/ROI; A/B testing.
- **LM Judge**: Rubric evals on golden dataset (accuracy/grounding/instructions); domain review.
- **Debug**: OpenTelemetry traces (prompts/tools/params/results).
- **Human Feedback**: Replicate bugs → Evals; alerts on patterns.
- **Evolution**: DevOps → MLOps → GenAIOps/AgentOps.

## Agent Interoperability
- **Agents & Humans**: Chatbots (text/JSON), HITL (clarification), Computer Use (UI control), Live Mode (voice/video).
- **Agents & Agents**: A2A (Agent Cards for discovery; async tasks).
- **Agents & Money**: AP2 (signed mandates), x402 (HTTP 402 micropayments).

## Securing Agents
### Trust Trade-Off
- Utility vs. Risk: Autonomy/tools → Rogue actions/leaks. Hybrid: Deterministic rules + AI guards.

### Single Agent
- **Hybrid Defense**: Hardcoded policies (e.g., block >$100); adversarial training/guard models.
- **ADK Security**: OAuth/SPIFFE identities; MCP/A2A governance; callbacks/plugins (pre-validation); Model Armor (prompt/response filters).

### Agent Identity: New Principal
| Category | Auth/Verification | Notes |
|----------|-------------------|-------|
| **Users** | OAuth/SSO | Full autonomy/responsibility. |
| **Agents** | SPIFFE | Delegated; verifiable, least-privilege. |
| **Services** | IAM | Deterministic, no agency. |

### Scaling to Fleet
- **Sprawl Risks**: Interactions/vulns/data flows.
- **Governance**: Central gateway (authZ chokepoint/logs); Registry (app store: discover/review/version/policy).
- **Cost/Reliability**: Scale-to-zero (irregular); SLAs (critical); monitoring.

### Security/Privacy Hardening
- Defense-in-Depth: No proprietary training; VPC; input/output filtering; IP indemnity.

### MCP-Specific Risks & Mitigations
| Risk | Description | Mitigations |
|------|-------------|-------------|
| **Dynamic Injection** | Servers add tools unannounced; e.g., books server adds purchases. | Allowlists; change notifications; pinning; controlled envs. |
| **Tool Shadowing** | Malicious tools mimic legit (e.g., save_secure_note vs. secure_storage). | Name collision checks (LLM semantic); mTLS; policy enforcement; HITL for risks. |
| **Malicious Defs/Contents** | Ingest prompts/inject via docs/schemas; exfil via returns. | Input/output sanitization; separate prompts; taint tracking; allowlist resources. |
| **Info Leaks** | Tools receive/expose sensitive data; Elicitation misuse. | Structured outputs/tags; least privilege; side-channel creds; no sensitive in context. |
| **Scope Limits** | Coarse authZ; no per-tool/resource creds. | Scoped tokens; audience validation; short expirations. |

- **Confused Deputy Example**: AI tricks MCP server (privileged deputy) into exfiling code via prompt injection.

## Agent Evolution/Learning
- **Aging Issue**: Degrade w/o adaptation; manual unscalable.
- **Sources**: Runtime (logs/traces/memory/HITL); External (policies/docs/critiques).
- **Techniques**:
  - Context: Refine prompts/examples/retrieval.
  - Tools: Gap ID → Create/modify (e.g., Python scripts).
  - Advanced: Reconfig patterns; RLHF.
- **Example (Compliance)**: Multi-agent (Query/Report/Critic/Learn) + HITL → Generalize rules (anonymize stats).
- **Agent Gym**: Offline sim (synthetic data/red-teaming/tool adoption/human consults); learn w/o prod risk.

## Advanced Agent Examples
### Google Co-Scientist
- Virtual collaborator: Goal → Hypotheses landscape (public/proprietary grounding).
- Multi-Agent: Supervisor delegates (Ranking/Generation/Evaluation/Reflection); scales w/ compute.
- Evolves: Loops/meta-loops improve ideas/judgment.
- *Figures*: Design; Workflow (e.g., supervisor plans, agents iterate).

### AlphaEvolve Agent
- Discovers/optimizes algorithms (math/CS).
- Evo: Gemini gen → Eval scores → Inspire next.
- Breakthroughs: Data center efficiency; Faster matrix mult; Open math.
- Human-AI: Transparent code; Guide metrics/exploration.
- *Figures*: Design; Evolution (transparent iterations).

## Conclusion
- Tools: Essential for real-world action; design granular/docs-focused.
- MCP: Enables ecosystem but needs governance (gateways/allowlists) for enterprise.
- Secure via hybrid defenses; evolve via runtime learning/HITL.
- Blueprint: Modular, auditable systems for autonomous partners.

## Endnotes Summary
50+ refs (e.g., MCP spec, ReAct/CoT papers, ADK docs, security blogs). Full p52-55; key: Anthropic MCP (2024-25), Google ADK/A2A.

*Revision Tip*: Master tool types/BPs + MCP primitives/risks. Tables for taxonomy/mitigations. Skim examples/figs; focus security for enterprise. TOC p3-6.