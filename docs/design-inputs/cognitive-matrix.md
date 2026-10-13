> **An input to DT1 from the owner, 13-10-2026, not a rule (D-UX-58).** `docs/DESIGN.md` takes a rule from it only with evidence (`docs/ROADMAP.md`, "The design team"). Rows of §4 that do not hold as written: curved corners (no evidence they are read faster, only that people prefer them); Weber-Fechner (misapplied, though the advice against pure black stays); Hick-Hyman (it concerns the number of choices, though the advice to keep a reset in reach stays); the 1px border with a shadow (GOV.UK, praised in §3, uses none). The quiz and simulation examples were written for another site; our tools' states are listed in ROADMAP. The critic's "first 100 ms" audit is left to the user tests.

# Cognitive Design Architecture & The Universal Translation Matrix
**System Specification for Autonomous AI Design Agents and Cognitive-Ergonomic UI**

---

## 1. Executive Thesis: Design as Cognitive Ergonomics

> *"Design is not arbitrary art; in software, design is the systematic reduction of cognitive friction. A user visits your site with a finite budget of mental energy. Every confusing layout choice, low-contrast paragraph, or erratic button placement burns mental cycles that should have gone toward understanding your content."*

When an interface introduces visual noise, layout ambiguity, or unpredicted behaviors, it incurs **cognitive friction**. The human brain must divert working memory from absorbing the actual domain material (e.g., technical concepts, educational curricula, transactional goals) to parsing the user interface itself. 

Aesthetic elegance is not the pursuit of decoration; it is the natural consequence of eliminating extraneous mental load.

---

## 2. Autonomous AI Design Team Architecture (DT1 Specification)

Autonomous LLM agents cannot experience biological sensory perception or "taste." They operate strictly on token prediction. To build a self-correcting, autonomous design team that maintains quality over time, taste must be translated into **formal constraints, deterministic tests, and an evidence-based memory pipeline**.

```
                           ┌────────────────────────────────────────┐
                           │               Product Owner            │
                           │   (Sets Vision, Brand Voice & Taste)   │
                           └──────────────────┬─────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              THE DESIGN ENGINE                                    │
│                                                                                   │
│  ┌─────────────────────────┐               ┌───────────────────────────────────┐  │
│  │     DESIGNER AGENT      │  Implements   │          DETERMINISTIC QA         │  │
│  │  - Strict Design Tokens │ ────────────► │  - axe-core (Contrast, ARIA)      │  │
│  │  - Semantic HTML        │               │  - Viewport Reflow (360px - 4K)   │  │
│  │  - Fixed Spatial Scales │               │  - Keyboard Navigation Hooks      │  │
│  └─────────────────────────┘               └─────────────────┬─────────────────┘  │
│               ▲                                              │                    │
│               │ Corrects                                     ▼                    │
│               │ Defects                    ┌───────────────────────────────────┐  │
│               │                            │           CRITIC AGENT            │  │
│               └─────────────────────────── │  - Multimodal Screenshot Audits   │  │
│                                            │  - Dynamic State-Machine Checks   │  │
│                                            │  - Cognitive Friction Scoring     │  │
│                                            └─────────────────┬─────────────────┘  │
└──────────────────────────────────────────────────────────────┼────────────────────┘
                                                               │
                                                               ▼
                                             ┌───────────────────────────────────┐
                                             │     KNOWLEDGE GRADUATION PIPELINE │
                                             │  - Triage in DESIGN-LESSONS.md    │
                                             │  - Graduate into DESIGN.md Tokens │
                                             └───────────────────────────────────┘
```

### 2.1 The Two-Agent Core (Generator-Discriminator Pair)
Rather than spawning an uncoordinated swarm of specialized agents (which creates context bloat and circular debate), the system implements a two-agent architecture:
* **The Designer Agent (Generator):** Proposes and implements interfaces using semantic components, predefined design tokens, and validated interaction patterns.
* **The Critic Agent (Discriminator):** Independently audits rendered outputs against explicit WCAG 2.2 AA rules, layout consistency heuristics, and cognitive load guidelines.

### 2.2 Three Tiers of Interface Verification
1. **Deterministic Automated Verification:** Headless engine checking mathematical contrast ratios, keyboard accessibility (`tabindex`, visible focus indicators), HTML semantic validity, and DOM reflow down to $360\text{ px}$.
2. **Visual & Multimodal Verification:** The Critic agent inspects rendered screenshots across devices (Desktop, Tablet, Mobile) and themes (Light, Dark).
3. **Empirical Human Verification:** You validate task clarity, gut feel, and voice. Real users validate task completion and comprehension.

### 2.3 Resolving Operational Pitfalls

#### A. Preventing "Memory Drift" via the Graduation Pipeline
Letting `docs/DESIGN-LESSONS.md` grow indefinitely creates context saturation and conflicting instructions.
* **Triage Stage:** New defects, user friction points, or review notes enter `docs/DESIGN-LESSONS.md` as active triage items.
* **Graduation Stage:** Once a rule is verified (e.g., *"Helper text must sit above input fields to prevent layout shift"*), it must be codified directly into `docs/DESIGN.md` as an immutable token/rule or built into component primitives.
* **Archive Stage:** Once codified in code, the item is removed from the active prompt to keep agent context tight and deterministic.

#### B. Dynamic State-Machine Audits
Static screenshots miss interactive edge cases. For simulations, interactive calculators, and quizzes, the Critic agent must audit an interaction matrix across five states:
1. **Empty / Default State:** Initial layout before interaction.
2. **Hover / Focus / Active State:** Visual affordance of clickability and focus boundaries.
3. **In-Progress State:** Computational execution, slider dragging, or physics animation running.
4. **Error / Boundary State:** Out-of-bounds input values, network failure, or invalid quiz responses.
5. **Completed / Reset State:** Clear recovery to the baseline state without page refresh.

#### C. Constraining Spatial Degrees of Freedom
Unconstrained agents generate arbitrary CSS (`padding: 19px`, `margin-top: 11px`). To ensure visual harmony, agents are restricted to:
* A strict **8-point spatial grid** ($4\text{ px}, 8\text{ px}, 12\text{ px}, 16\text{ px}, 24\text{ px}, 32\text{ px}, 48\text{ px}, 64\text{ px}$).
* Explicit semantic design tokens (`bg-canvas-base`, `text-content-primary`, `border-subtle`).

---

## 3. Case Studies: Top 5 Cognitive-Load-Reducing Interfaces

| Platform | Domain | Primary Cognitive Strategy | Core Friction Eliminated |
| :--- | :--- | :--- | :--- |
| **Bartosz Ciechanowski** | Technical Education | Real-time WebGL physical shaders linked directly to controls | Mental simulation debt (user doesn't have to visualize moving mechanics) |
| **GOV.UK** | Civic Transactions | "One thing per page" architecture, zero decorative elevation | Orientation anxiety and choice paralysis |
| **Linear** | Project Velocity | Sub-$100\text{ ms}$ interactions, 1px alpha-border elevation | Spatial disruption and working-memory decay |
| **Our World in Data** | Empirical Research | Semantic color permanence and direct line-endpoint labeling | Split-attention effect and cross-referencing eye fatigue |
| **Stripe Documentation** | API Engineering | Synchronized dual-pane narrative and executable code payloads | Context-switching overhead between reference and execution |

### Detailed Breakdown

#### 1. Bartosz Ciechanowski (`ciechanow.ski`)
* **Interactive Physical Simulators:** Concepts are not merely explained in text; they are modeled mathematically via custom WebGL shaders.
* **Proximity of Control to Effect:** Sliders and toggles reside directly adjacent to the variable they modulate, never tucked away in a distant sidebar.
* **Functional Color Usage:** The base canvas remains stark paper-white. Color is reserved entirely for signaling state changes (e.g., air temperature shifts from cool blue to compressed red).

#### 2. GOV.UK (`gov.uk`)
* **Borrowing Interaction, Not Identity:** Borrows proven usability patterns (step-by-step disclosures, single-choice radios, explicit error summaries) without forcing generic institutional aesthetics onto separate domains.
* **Zero Decorative Elevation:** Eliminates drop shadows, blurs, and surface gradients. The visual cortex is freed from computing simulated light sources.
* **Deterministic Action Targets:** High-contrast buttons with unmistakable focus boundaries prevent hesitation about clickability.

#### 3. Linear (`linear.app`)
* **Micro-Elevation via 1px Inner Borders:** Avoids broad, blurry drop shadows that soften layout boundaries. Employs 1px borders with fine alpha transparency (`rgba(255, 255, 255, 0.08)`).
* **Perceptual Speed ($<100\text{ ms}$):** State transitions complete before human short-term memory decays, keeping the operator in a continuous cognitive flow state.
* **Deep Slate Backgrounds:** Uses balanced slate tones (`#0d0e11`, `#15161c`) rather than harsh `#000000` to prevent astigmatic halation and eye fatigue.

#### 4. Our World in Data (`ourworldindata.org`)
* **Direct Endpoint Labeling:** Line graphs place metric labels directly at the end of data lines, completely removing floating legend boxes.
* **Persistent Semantic Color:** A hue assigned to an entity remains identical across every chart on the page, removing the need to re-learn visual encodings.
* **Progressive Disclosure:** Presents a clean primary baseline, allowing deep exploratory filters only on demand.

#### 5. Stripe Documentation (`docs.stripe.com`)
* **Synchronized Dual-Pane Reading:** Theoretical explanation sits on the left; functional, copyable code payloads sit on the right.
* **Cross-Pane Token Highlighting:** Hovering over a parameter in the explanatory text immediately highlights the matching JSON attribute in the code block.
* **Contrast Hierarchy:** Code syntax highlighting is tuned for instant readability against muted backgrounds without visually overpowering the prose.

---

## 4. The Universal Translation Matrix (The Rosetta Stone)

What looks like subjective aesthetic polish is actually the application of human visual neuroscience, cognitive psychology, and biomechanics.

| Design Token / Surface Choice | Visual / Aesthetic Label | Underlying Cognitive / Biophysical Law | Cognitive Friction Eliminated |
| :--- | :--- | :--- | :--- |
| **8px Spatial Scale**<br>$(8, 16, 24, 32, 48\text{ px})$ | "Clean rhythm and balance" | **Gestalt Law of Proximity:** Visual elements close to one another are automatically grouped into a single unit by early visual processing. | **Chunking Overhead:** Prevents working-memory fragmentation by organizing disparate fields into clear mental groups. |
| **1px Inner Border + 4px Ambient Blur** | "Modern card elevation" | **Figure-Ground Organization:** The brain interprets relative physical depth using light-source models to determine what sits in the foreground. | **Z-Index Ambiguity:** Immediately signals which surfaces are actionable overlays versus passive background canvas. |
| **Direct Endpoint Labels**<br>(No floating legend box) | "Clean data styling" | **Sweller’s Split-Attention Effect:** Forcing the brain to reconcile two physically separated information sources burns working-memory capacity. | **Saccadic Energy Burn:** Eliminates eye-scanning cycles between data points and a separate legend. |
| **Slate Gray (`#0f172a`)**<br>(Instead of pure black `#000000`) | "Soft dark mode" | **Weber-Fechner Law of Sensory Perception:** Extreme contrast ratios ($21:1$) overstimulate retinal photoreceptors, causing halation. | **Photoreceptor Fatigue:** Prevents visual exhaustion and text bleeding during extended technical sessions. |
| **$\ge 44 \times 44\text{ px}$ Touch Targets** | "Chunky mobile buttons" | **Fitts’s Law ($T = a + b \log_2\left(\frac{2D}{W}\right)$):** Target acquisition time depends on distance ($D$) and target width ($W$). | **Motor Hesitation:** Eliminates the fine-motor micro-adjustments needed to avoid mis-clicks. |
| **Curved Borders**<br>($6\text{ px}$ to $12\text{ px}$ radius) | "Friendly, modern corners" | **Retinal Saccade Processing:** Sharp $90^\circ$ angles trigger edge-detection alerts in visual cortex area V1, slowing ocular scanpaths. | **Visual Agitation:** Allows the eye to sweep across card boundaries without snagging on sharp vertices. |
| **$150\text{ ms} - 200\text{ ms}$ Cubic-Bezier Motion** | "Snappy micro-interactions" | **Kinematic Causality:** Real-world objects do not teleport. An interface change under $100\text{ ms}$ feels instantaneous; $>300\text{ ms}$ feels sluggish. | **Spatial Disorientation:** Confirms an action triggered a reaction without forcing the user to wait on animations. |
| **Isolated Accent Color**<br>(90% neutral / 10% accent) | "Minimalist palette" | **Treisman’s Feature Integration Theory:** Distinct color variations are parsed pre-attentively in parallel visual pathways in $<50\text{ ms}$. | **Visual Search Friction:** Guides the user's eye directly to the primary action without scanning the entire page. |
| **$60 - 75$ Character Measure** | "Optimal line length" | **Oculomotor Saccadic Return:** When reading, the eye jumps across lines. Overly long lines cause the eye to land on the wrong line on return sweeps. | **Line-Tracking Errors:** Prevents reading interruptions and accidental re-reading of lines. |
| **State Reset & Undo Controls** | "Defensive UI" | **Hick-Hyman Law & Risk Aversion:** If an interaction risks unrecoverable changes, decision time increases drastically. | **Exploration Paralysis:** Enables fearless interaction with interactive simulations and complex forms. |

---

## 5. Implementation Rules for LLM Agents

### 5.1 System Prompt Directives for the Designer Agent
1. **Ban Subjective Adjectives:** Never describe layouts as "sleek," "modern," "friendly," or "beautiful."
2. **Mandate Cognitive Justifications:** Every layout structure must be justified using ergonomic principles:
   * *Bad:* "Adding a soft card style to make the quiz look nice."
   * *Good:* "Wrapping the quiz question in a single container with a 1px border to enforce Gestalt chunking and isolate focus."
3. **Strict Token Adherence:** Do not emit arbitrary CSS values. Rely entirely on the 8pt spacing scale, semantic color variables, and defined typography measures.

### 5.2 System Prompt Directives for the Critic Agent
1. **Pre-attentive Focus Audit:** Where does the eye land in the first $100\text{ ms}$? If it lands on a non-interactive decorative element before the primary task, flag as a defect.
2. **Split-Attention Audit:** Is any control separated from its visual consequence? Is an input slider placed far from its visualization? If yes, flag as a **Blocker**.
3. **State Matrix Audit:** Confirm that empty, active, loading, error, and completed states are all accounted for and visually coherent.
4. **Contrast & Target Size Math:** Compute contrast ratios deterministically against WCAG 2.2 AA ($4.5:1$ standard text, $3:1$ UI components) and verify touch targets meet minimum dimensions.