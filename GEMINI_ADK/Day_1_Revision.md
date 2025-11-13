# Introduction to Agents and Agent Architectures - Revision Notes
*Document Overview*: 54-page guide (Nov 2025) by Alan Blount et al. (Google). First in 5-part series on building production-grade AI agents. Builds on prior whitepapers. Focus: From prototypes to secure, scalable systems. Key themes: Anatomy (Model/Tools/Orchestration), Taxonomy (Levels 0-4), Design/Deployment/Ops/Security/Evolution.

## Core Concepts
- **AI Agent Definition**: Combination of models, tools, orchestration layer, and runtime services using LM in a loop to accomplish goals. Agents curate LM context windows for reasoning, acting, and observing.
- **Paradigm Shift**: From predictive AI (passive tasks like Q&A/image gen) to autonomous agents (goal-oriented, multi-step execution without constant human input).
- **Developer Role**: Shift from "bricklayer" (explicit code) to "director" (set prompts/tools/context; guide/debug autonomous "actor").
- **Challenges**: LM flexibility causes unreliability; success via context engineering, evals > prompts.
- **Agent as Context Curator**: Relentless loop: Assemble context (instructions, history, tools, results) → Prompt LM → Observe → Reassemble.

## Agentic Problem-Solving Process (5-Step Loop)
Continuous cycle (from *Agentic System Design* book):
1. **Get the Mission**: High-level goal (user request or trigger, e.g., "Organize team travel").
2. **Scan the Scene**: Gather context (user input, memory, tools like calendars/DBs/APIs).
3. **Think It Through**: LM reasons/plans (chain: e.g., "Get roster → Check calendars").
4. **Take Action**: Orchestration invokes tool (API/code/DB query).
5. **Observe & Iterate**: Add results to memory/context; loop to Step 3 until goal met.

*Example (Customer Support)*: Query order #12345 → Plan (find order → track shipment → report) → Tools (find_order → get_shipping_status) → Response: "Out for Delivery".

## Taxonomy of Agentic Systems (Levels 0-4)
Classifies agents by complexity/capabilities. Each builds on prior; use to scope builds.

| Level | Description | Key Capabilities | Example |
|-------|-------------|------------------|---------|
| **0: Core Reasoning System** | Isolated LM (no tools/memory). Static pre-trained knowledge. | Explains concepts/plans; blind to real-time events. | Explain baseball rules (but not last game's score). |
| **1: Connected Problem-Solver** | Adds tools for external access. | Real-time info/actions (e.g., search/DB query). | "Yankees score last night?" → Calls Google Search API. |
| **2: Strategic Problem-Solver** | Adds context engineering for multi-step planning. | Curates focused context; proactive (e.g., email → calendar add). | "Coffee shop halfway?" → Maps → Filtered search (≥4 stars). |
| **3: Collaborative Multi-Agent** | Team of specialists; agents as tools. | Division of labor; delegates sub-tasks. | Project Manager → MarketResearchAgent + MarketingAgent. |
| **4: Self-Evolving System** | Autonomous creation/adaptation. | Builds new tools/agents; meta-reasoning. | Needs sentiment tool? → Creates SentimentAnalysisAgent. |

*Figure*: Pyramid (L0 base → L4 apex).

## Core Agent Architecture
### Model: The "Brain"
- LM/foundation model for reasoning/decisions.
- Choices: General/fine-tuned/multimodal; balance quality/speed/cost.
- Best Practices: Task-specific evals (e.g., code on private repo); route tasks (e.g., Gemini Pro for planning, Flash for simple); plan for evolution (CI/CD evals).
- Multimodal: Native (Gemini Live) or tools (Vision/Speech-to-Text APIs).

### Tools: The "Hands"
- Connect reasoning to world: Retrieve info (RAG/NL2SQL) or act (APIs/code exec/HITL).
- Types:
  - **Retrieval**: RAG (vector DBs/Search); NL2SQL for analytics.
  - **Execution**: APIs (email/schedule); code in sandbox (SQL/Python).
  - **HITL**: Pause for confirmation/input (e.g., SMS).
- Function Calling: OpenAPI/MCP schemas for params/responses; native (Gemini Search).

### Orchestration Layer: The "Nervous System"
- Manages loop: Planning/memory/strategy (CoT/ReAct).
- Design: Autonomy spectrum (deterministic → LM-driven); no-code vs. code-first (ADK).
- Framework Needs: Open (no lock-in), hybrid (rules + LM), observable (traces/logs).

## Core Design Choices
- **Instruct w/ Domain/Persona**: System prompt as "constitution" (rules/tone/tools/examples).
- **Augment w/ Context**:
  - Short-term: Session history (state/artifacts/threads).
  - Long-term: RAG tool for persistence (user prefs/past outcomes).
- **Multi-Agent Patterns**:
  - **Coordinator**: Routes sub-tasks (dynamic/non-linear).
  - **Sequential**: Linear pipeline.
  - **Iterative Refinement**: Generator + Critic loop.
  - **HITL**: Pause for approval.

## Agent Deployment & Services
- **Body/Legs**: Host on secure/scalable server (e.g., Vertex AI Agent Engine; Docker/Cloud Run/GKE).
- Services: Monitoring/logging/memory persistence; decide logs/security (privacy/residency/compliance).
- Best: Purpose-built (Agent Engine) for runtime; DevOps for custom.

## Agent Ops: Structured Approach to Unpredictable
- Evolution of DevOps/MLOps/GenAIOps for stochastic agents.
- **Measure KPIs**: A/B-like (goal completion, satisfaction, latency, cost, business impact).
- **Quality Eval**: LM Judge (rubric on golden dataset: accuracy/grounding/instructions); domain review.
- **Metrics-Driven Dev**: Compare versions; A/B deploys.
- **Debug**: OpenTelemetry traces (prompt/reason/tool/params/result).
- **Human Feedback**: Close loop (replicate → add to evals); alerts on patterns.
- *Figure*: DevOps → MLOps → GenAIOps relationships.

## Agent Interoperability
- **Agents & Humans**: Chatbots (text/JSON); HITL (intent/clarification); Computer Use (UI control); Live Mode (bidirectional voice/video).
- **Agents & Agents**: A2A protocol (Agent Card for discovery; async tasks for comms).
- **Agents & Money**: AP2 (signed mandates for auth); x402 (HTTP 402 micropayments).

## Securing Agents
### Single Agent: Trust Trade-Off
- Utility vs. Risk: Power (autonomy/tools) → Rogue actions/data leaks.
- **Hybrid Defense**:
  - Deterministic: Hardcoded rules/policy engine (e.g., block >$100 buys).
  - Reasoning-Based: Adversarial training; guard models (screen plans).
- **ADK Security**: Identities (OAuth/service/agent); API governance (MCP/A2A); Callbacks/Plugins (pre-tool validation); Model Armor (prompt/response filtering).

### Agent Identity: New Principal
- 3rd Category (beyond users/services): Verifiable (SPIFFE); least-privilege perms.
- *Table*: Users (OAuth/SSO, full autonomy); Agents (SPIFFE, delegated); Services (IAM, deterministic).

### Scaling to Fleet
- **Sprawl Risk**: Interactions/data flows/vulns.
- **Governance**: Central gateway (authZ chokepoint, logs/metrics); Registry (app store for agents/tools: discover/review/version/policy).
- **Cost/Reliability**: Scale-to-zero (irregular); Provisioned Throughput/SLAs (critical); monitoring.

### Security/Privacy Hardening
- Defense-in-Depth: No training on proprietary data; VPC Controls; Input/output filtering; IP indemnity.

## How Agents Evolve/Learn
- **Aging Problem**: Degrade w/o adaptation; manual updates unscalable.
- **Sources**: Runtime (logs/traces/memory/HITL); External (policies/docs/critiques).
- **Techniques**:
  - Context Engineering: Refine prompts/examples/retrieval.
  - Tool Opt/Creation: Identify gaps → New tools/scripts.
  - Advanced: Reconfig patterns; RLHF.
- **Example (Compliance)**: Multi-agent (Query/Report/Critique/Learn) + HITL → Generalize rules (e.g., anonymize stats).
- **Agent Gym (Next Frontier)**: Offline platform (sim env, synthetic data, red-teaming, tool adoption, human consults).

## Advanced Agent Examples
### Google Co-Scientist
- Virtual collaborator: Goal → Hypotheses landscape (public/proprietary grounding).
- Multi-Agent: Supervisor delegates (Ranking/Generation/Evaluation/Reflection); scales w/ compute.
- Evolves: Loops/meta-loops improve ideas + judgment.
- *Figures*: Design system; Workflow.

### AlphaEvolve Agent
- Discovers/optimizes algorithms (math/CS).
- Evo Process: Gemini gen → Eval scores → Inspire next gen.
- Breakthroughs: Data center efficiency; Faster matrix mult; Open math solutions.
- Human-AI: Transparent code; Guide metrics/exploration.
- *Figures*: Design system; Algorithm evolution.

## Conclusion
- Agents: Autonomous partners via Model/Tools/Orchestration loop.
- Paradigm: Director role; Rigor in tools/context/evals.
- Blueprint for collaborative, adaptable team members; architecture key to power.

## Endnotes Summary
45+ references (e.g., ReAct/CoT papers; ADK docs; A2A/MCP; Security whitepapers). Full list p52-54 for deep dives.

*Revision Tip*: Focus on 5-Step Loop + Taxonomy + Architecture Trio. Re-read examples for patterns. Total pages skim: TOC (p3-5), visuals (Figs 1-11).