# AGENTS

## Commands

- **Lint/Format**: `bun check` (runs biome with auto-fix)
- **Build all**: `bun turbo build`
- **Dev server**: `bun turbo dev`
- **Type check**: `bun turbo check-types`
- **Native app**: `cd apps/native && bun start` (Expo)

## Code Style (Biome + Ultracite)

- Use `const` by default, `let` when needed, never `var`
- Prefer `for...of` over `.forEach()`, arrow functions for callbacks
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Template literals over string concatenation, destructuring for objects/arrays
- Explicit types for function params/returns; prefer `unknown` over `any`
- React: function components, hooks at top level, proper `key` props
- Error handling: throw `Error` objects with messages, use try-catch meaningfully
- No `console.log`/`debugger` in production; remove `.only`/`.skip` from tests
- Security: `rel="noopener"` with `target="_blank"`, avoid `dangerouslySetInnerHTML`

## Server (Elysia) Architecture (`apps/server`)

Reference: [Elysia “Best Practice”](https://elysiajs.com/essential/best-practice)

### Current state (quick audit)

- **Entrypoint**: `apps/server/src/index.ts` composes the app with CORS, optional Swagger, `auth`, and `recordingsRoutes`.
- **Auth**: implemented as an Elysia plugin using `derive` in `apps/server/src/middleware/auth-factory.ts` and configured in `apps/server/src/middleware/auth.ts`.
- **Routes**: `apps/server/src/routes/recordings.ts` is an Elysia “controller” (Elysia instance), uses `t` validation, and runs Drizzle queries inline.

### What we already do that matches Elysia best practice

- **Elysia instance = controller**: routing lives on Elysia instances and is composed via `.use(...)` (good type inference).
- **Validation as the source of truth**: we already use `t.Object(...)` for query/params.
- **Request-dependent logic as Elysia plugins**: auth uses `derive`, which keeps request-time concerns in the framework layer.

### Gaps / improvements to align with the docs

- **Prefer feature-based modules**: the docs recommend `src/modules/<feature>/{index.ts,service.ts,model.ts}` instead of generic `routes/` + `middleware/`.
- **Extract services**: move non-request-dependent business logic (eg. DB queries) out of route handlers into service functions/classes.
- **Don’t pass `Context` around**: destructure what you need in handlers and pass only those values to services/controllers.
- **Decorate sparingly**: only `decorate`/`derive` request-dependent values; avoid pushing general business logic into decorators.
- **Name major plugins**: use `new Elysia({ name: '...' })` for “singleton” plugins so Elysia plugin deduplication is reliable.

### Recommended folder structure (new work / refactors)

```text
apps/server/src
  modules
    auth
      index.ts    # controller/plugin (Elysia instance)
      service.ts  # request-dependent logic (derive/macro), if needed
      model.ts    # `t.*` schemas (+ `typeof schema.static` types if needed)
    recordings
      index.ts    # controller (routes + validation + HTTP bits)
      service.ts  # DB/business logic (no Elysia `Context`)
      model.ts    # request/response schemas
  shared
    http
    errors
    env
```

### Conventions (Elysia-specific)

- **Controller**: `export const recordings = new Elysia({ prefix: '/recordings', name: 'Recordings.Controller' })...`
- **Service**: should not accept Elysia `Context`; accept primitives/objects (`userId`, `limit`, `offset`) and return domain data.
- **Model**: define schemas with `t.*`; don't write separate interfaces/classes for the same payload—use `typeof schema.static` if you need the type.
- **Error handling**: use custom `HttpError` classes (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`); plugins handle their own errors via `.error()` + `.onError()`; global `errorHandler` catches all other errors.
- **Testing**: prefer controller-level tests using `.handle(new Request(...))` so lifecycle + validation run.

## Cursor Rules

See `.cursor/rules/ultracite.mdc` for comprehensive Biome/Ultracite standards.

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:

- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:

- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
  </usage>

<available_skills>

<skill>
<name>brainstorming</name>
<description>"You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."</description>
<location>global</location>
</skill>

<skill>
<name>code-reviewer</name>
<description>Comprehensive code review skill for TypeScript, JavaScript, Python, Swift, Kotlin, Go. Includes automated code analysis, best practice checking, security scanning, and review checklist generation. Use when reviewing pull requests, providing code feedback, identifying issues, or ensuring code quality standards.</description>
<location>global</location>
</skill>

<skill>
<name>dispatching-parallel-agents</name>
<description>Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies</description>
<location>global</location>
</skill>

<skill>
<name>executing-plans</name>
<description>Use when you have a written implementation plan to execute in a separate session with review checkpoints</description>
<location>global</location>
</skill>

<skill>
<name>finishing-a-development-branch</name>
<description>Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup</description>
<location>global</location>
</skill>

<skill>
<name>frontend-design</name>
<description>Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.</description>
<location>global</location>
</skill>

<skill>
<name>product-manager-toolkit</name>
<description>Comprehensive toolkit for product managers including RICE prioritization, customer interview analysis, PRD templates, discovery frameworks, and go-to-market strategies. Use for feature prioritization, user research synthesis, requirement documentation, and product strategy development.</description>
<location>global</location>
</skill>

<skill>
<name>receiving-code-review</name>
<description>Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation</description>
<location>global</location>
</skill>

<skill>
<name>requesting-code-review</name>
<description>Use when completing tasks, implementing major features, or before merging to verify work meets requirements</description>
<location>global</location>
</skill>

<skill>
<name>senior-architect</name>
<description>Comprehensive software architecture skill for designing scalable, maintainable systems using ReactJS, NextJS, NodeJS, Express, React Native, Swift, Kotlin, Flutter, Postgres, GraphQL, Go, Python. Includes architecture diagram generation, system design patterns, tech stack decision frameworks, and dependency analysis. Use when designing system architecture, making technical decisions, creating architecture diagrams, evaluating trade-offs, or defining integration patterns.</description>
<location>global</location>
</skill>

<skill>
<name>subagent-driven-development</name>
<description>Use when executing implementation plans with independent tasks in the current session</description>
<location>global</location>
</skill>

<skill>
<name>systematic-debugging</name>
<description>Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes</description>
<location>global</location>
</skill>

<skill>
<name>test-driven-development</name>
<description>Use when implementing any feature or bugfix, before writing implementation code</description>
<location>global</location>
</skill>

<skill>
<name>ui-design-system</name>
<description>UI design system toolkit for Senior UI Designer including design token generation, component documentation, responsive design calculations, and developer handoff tools. Use for creating design systems, maintaining visual consistency, and facilitating design-dev collaboration.</description>
<location>global</location>
</skill>

<skill>
<name>using-git-worktrees</name>
<description>Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification</description>
<location>global</location>
</skill>

<skill>
<name>using-superpowers</name>
<description>Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions</description>
<location>global</location>
</skill>

<skill>
<name>ux-researcher-designer</name>
<description>UX research and design toolkit for Senior UX Designer/Researcher including data-driven persona generation, journey mapping, usability testing frameworks, and research synthesis. Use for user research, persona creation, journey mapping, and design validation.</description>
<location>global</location>
</skill>

<skill>
<name>verification-before-completion</name>
<description>Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always</description>
<location>global</location>
</skill>

<skill>
<name>writing-plans</name>
<description>Use when you have a spec or requirements for a multi-step task, before touching code</description>
<location>global</location>
</skill>

<skill>
<name>writing-skills</name>
<description>Use when creating new skills, editing existing skills, or verifying skills work before deployment</description>
<location>global</location>
</skill>

</available_skills>

<!-- SKILLS_TABLE_END -->

</skills_system>
