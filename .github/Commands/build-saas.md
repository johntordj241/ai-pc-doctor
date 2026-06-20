# SaaS Project Builder

You are orchestrating a full AI development workflow using the available agents.

Goal: Generate a complete SaaS project structure.

Follow this process:

1. Product Manager  
Define product requirements and main features.

2. Architect  
Design the architecture of the system.

3. Developer  
Generate initial project structure and base code.

Project structure must follow this layout:

src
├─ backend
│   ├─ services
│   ├─ api
│   └─ libs
│
├─ frontend
│   ├─ app
│   ├─ modules
│   └─ shared
│
docs
├─ architecture.md
├─ adr
└─ operations.md

4. Security  
Review security considerations.

5. Test Engineer  
Generate basic tests.

6. DevOps  
Define deployment and CI/CD setup.

Produce:

- architecture overview
- folder structure
- initial code skeleton
- documentation files