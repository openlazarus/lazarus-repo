export const defaultFlowDocument = `flow:
  meta:
    title: "Sample Flow Diagram"
    author: "Flow User"
    version: "1.0"
    
  nodes:
    - id: central
      type: concept
      title: "Central Idea"
      content: |
        This is the main concept
        that drives everything
      position: center
      style: primary
      
    - id: feature1
      type: action
      title: "Feature 1"
      content: "First major feature"
      position:
        relative: central
        direction: northwest
        distance: medium
      style: secondary
      
    - id: feature2
      type: action
      title: "Feature 2"
      content: "Second major feature"
      position:
        relative: central
        direction: northeast
        distance: medium
      style: secondary
      
    - id: feature3
      type: action
      title: "Feature 3"
      content: "Third major feature"
      position:
        relative: central
        direction: south
        distance: medium
      style: secondary
      
    - id: decision
      type: decision
      title: "Key Decision"
      content: "Should we proceed?"
      position:
        relative: feature3
        direction: south
        distance: near
      style: warning
      
    - id: note1
      type: note
      title: "Important Note"
      content: |
        Remember to consider
        all stakeholders
      position:
        relative: central
        direction: east
        distance: far
      style: subtle
      
  connections:
    - from: central
      to: [feature1, feature2, feature3]
      type: flow
      
    - from: feature3
      to: decision
      type: flow
      
    - from: decision
      to: [feature1, feature2]
      type: dependency
      style: dashed
      label: "if yes"
      
  containers:
    - id: features
      title: "Core Features"
      contains: [feature1, feature2, feature3]
      style: subtle
`

export const systemArchitectureTemplate = `flow:
  meta:
    title: "System Architecture"
    author: "Engineering Team"
    version: "1.0"
    
  nodes:
    - id: client
      type: concept
      title: "Client App"
      content: "React Frontend"
      position: [200, 100]
      style: primary
      icon: "app"
      
    - id: api
      type: concept
      title: "API Gateway"
      content: |
        REST endpoints
        Authentication
      position: [400, 100]
      style: primary
      icon: "network"
      
    - id: auth
      type: concept
      title: "Auth Service"
      content: "JWT tokens"
      position: [600, 100]
      style: secondary
      icon: "lock.shield"
      
    - id: database
      type: concept
      title: "PostgreSQL"
      content: "Primary database"
      position: [300, 300]
      style: success
      icon: "cylinder"
      
    - id: cache
      type: concept
      title: "Redis Cache"
      content: "Session storage"
      position: [500, 300]
      style: warning
      icon: "bolt"
      
    - id: queue
      type: concept
      title: "Message Queue"
      content: "Async processing"
      position: [400, 450]
      style: secondary
      icon: "arrow.right.arrow.left"
      
  connections:
    - from: client
      to: api
      type: flow
      label: "HTTPS"
      
    - from: api
      to: auth
      type: flow
      label: "validate"
      
    - from: api
      to: [database, cache]
      type: flow
      
    - from: api
      to: queue
      type: flow
      label: "async tasks"
      
  containers:
    - id: backend
      title: "Backend Services"
      contains: [api, auth, database, cache, queue]
      style: subtle
`

export const projectPlanTemplate = `flow:
  meta:
    title: "Project Roadmap"
    author: "Project Manager"
    version: "1.0"
    
  nodes:
    - id: kickoff
      type: action
      title: "Project Kickoff"
      content: "Initial planning"
      position: [100, 200]
      style: success
      properties:
        status: approved
        priority: high
        dueDate: 2024-01-15
        
    - id: research
      type: action
      title: "Research Phase"
      content: |
        User interviews
        Market analysis
      position:
        relative: kickoff
        direction: east
        distance: medium
      properties:
        status: review
        priority: high
        assignee: "research@team.com"
        
    - id: design
      type: action
      title: "Design Sprint"
      content: "UI/UX design"
      position:
        relative: research
        direction: east
        distance: medium
      properties:
        status: draft
        priority: medium
        
    - id: mvp
      type: action
      title: "MVP Development"
      content: "Core features"
      position:
        relative: design
        direction: east
        distance: medium
      properties:
        status: draft
        priority: high
        
    - id: testing
      type: action
      title: "Testing & QA"
      content: "Quality assurance"
      position:
        relative: mvp
        direction: south
        distance: near
      properties:
        status: draft
        
    - id: launch
      type: action
      title: "Product Launch"
      content: "Go to market"
      position:
        relative: mvp
        direction: east
        distance: medium
      style: primary
      properties:
        status: draft
        priority: critical
        
  connections:
    - from: kickoff
      to: research
      type: flow
      
    - from: research
      to: design
      type: flow
      
    - from: design
      to: mvp
      type: flow
      
    - from: mvp
      to: testing
      type: flow
      
    - from: testing
      to: launch
      type: flow
      label: "when ready"
      
  annotations:
    - target: mvp
      content: |
        Consider using agile sprints
        for better iteration
      author: "Tech Lead"
`

export const essayOutlineTemplate = `flow:
  meta:
    title: "Essay Outline"
    author: "Student"
    version: "1.0"
    
  nodes:
    - id: thesis
      type: concept
      title: "Main Thesis"
      content: |
        Technology shapes society
        in fundamental ways
      position: center
      style: primary
      
    - id: intro
      type: note
      title: "Introduction"
      content: "Hook and context"
      position:
        relative: thesis
        direction: north
        distance: medium
        
    - id: argument1
      type: concept
      title: "Communication"
      content: |
        How tech changed
        human interaction
      position:
        relative: thesis
        direction: west
        distance: medium
        
    - id: argument2
      type: concept
      title: "Education"
      content: |
        Digital transformation
        of learning
      position:
        relative: thesis
        direction: east
        distance: medium
        
    - id: argument3
      type: concept
      title: "Work & Economy"
      content: |
        Automation and
        remote work
      position:
        relative: thesis
        direction: south
        distance: medium
        
    - id: conclusion
      type: note
      title: "Conclusion"
      content: "Synthesis and future"
      position:
        relative: argument3
        direction: south
        distance: medium
        
  connections:
    - from: intro
      to: thesis
      type: flow
      
    - from: thesis
      to: [argument1, argument2, argument3]
      type: hierarchy
      
    - from: [argument1, argument2, argument3]
      to: conclusion
      type: flow
`
