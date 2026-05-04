'use client'

export interface SlideTemplate {
  label: string
  description: string
  icon: string
  category: 'Content' | 'Data' | 'Business' | 'Visual'
  snippet: string
}

export const slideTemplates: SlideTemplate[] = [
  // Content Slides
  {
    label: 'Title Slide',
    description: 'Opening slide with title and subtitle',
    icon: '📄',
    category: 'Content',
    snippet: `- type: title
  title: "Your Title Here"
  subtitle: "Your subtitle or tagline"
  background:
    type: gradient
    value: gradient-purple`,
  },
  {
    label: 'Content Slide',
    description: 'Flexible content with text, lists, and images',
    icon: '📝',
    category: 'Content',
    snippet: `- type: content
  title: "Content Title"
  layout: single
  content:
    - type: text
      value: "Your main message here"
    - type: list
      items:
        - "First point"
        - "Second point"
        - "Third point"`,
  },
  {
    label: 'Two Column Layout',
    description: 'Side-by-side content comparison',
    icon: '📑',
    category: 'Content',
    snippet: `- type: content
  title: "Two Column Content"
  layout: two-column
  content:
    left:
      - type: text
        value: "Left column content"
    right:
      - type: text
        value: "Right column content"`,
  },

  // Data Slides
  {
    label: 'Bar Chart',
    description: 'Data visualization with bar chart',
    icon: '📊',
    category: 'Data',
    snippet: `- type: data-viz
  title: "Quarterly Revenue"
  subtitle: "In millions USD"
  data:
    type: bar
    labels: ["Q1", "Q2", "Q3", "Q4"]
    datasets:
      - label: "2023"
        data: [45, 52, 48, 61]
        backgroundColor: "#007AFF"
      - label: "2024"
        data: [52, 58, 55, 68]
        backgroundColor: "#34C759"`,
  },
  {
    label: 'Line Chart',
    description: 'Trends and growth visualization',
    icon: '📈',
    category: 'Data',
    snippet: `- type: data-viz
  title: "Growth Trend"
  data:
    type: line
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    datasets:
      - label: "Users"
        data: [1200, 1900, 3000, 5000, 6200, 8300]
        borderColor: "#007AFF"`,
  },
  {
    label: 'Pie Chart',
    description: 'Distribution and proportions',
    icon: '🥧',
    category: 'Data',
    snippet: `- type: data-viz
  title: "Market Share"
  data:
    type: pie
    labels: ["Product A", "Product B", "Product C", "Others"]
    datasets:
      - data: [45, 25, 20, 10]
        backgroundColor: ["#007AFF", "#34C759", "#FF9500", "#AF52DE"]`,
  },
  {
    label: 'Data Table',
    description: 'Structured data in table format',
    icon: '📋',
    category: 'Data',
    snippet: `- type: table
  title: "Performance Metrics"
  data:
    headers: ["Metric", "Q1", "Q2", "Q3", "Q4"]
    rows:
      - ["Revenue", "45M", "52M", "48M", "61M"]
      - ["Users", "12K", "15K", "18K", "22K"]
      - ["Growth", "15%", "25%", "20%", "22%"]
    style:
      striped: true
      hover: true`,
  },

  // Business Slides
  {
    label: 'KPI Dashboard',
    description: 'Key performance indicators',
    icon: '📊',
    category: 'Business',
    snippet: `- type: metrics
  title: "Q4 Performance"
  metrics:
    - label: "Revenue"
      value: "$12.5M"
      change:
        value: 23
        type: increase
      icon: "💰"
    - label: "Active Users"
      value: "45.2K"
      change:
        value: 15
        type: increase
      icon: "👥"
    - label: "Conversion Rate"
      value: "3.2%"
      change:
        value: 0.5
        type: increase
      icon: "📈"`,
  },
  {
    label: 'Timeline',
    description: 'Project roadmap or history',
    icon: '🗓️',
    category: 'Business',
    snippet: `- type: timeline
  title: "Project Roadmap"
  events:
    - date: "Q1 2024"
      title: "Project Kickoff"
      description: "Initial planning and team formation"
    - date: "Q2 2024"
      title: "Development Phase"
      description: "Core feature implementation"
      milestone: true
    - date: "Q3 2024"
      title: "Beta Launch"
      description: "Limited release to test users"
    - date: "Q4 2024"
      title: "Full Release"
      description: "Public launch and marketing campaign"
      milestone: true`,
  },
  {
    label: 'Process Flow',
    description: 'Step-by-step workflow',
    icon: '🔄',
    category: 'Business',
    snippet: `- type: process
  title: "Implementation Process"
  steps:
    - title: "Discovery"
      description: "Understand requirements and goals"
      status: completed
    - title: "Design"
      description: "Create solution architecture"
      status: completed
    - title: "Development"
      description: "Build and test features"
      status: current
    - title: "Deployment"
      description: "Launch to production"
      status: upcoming`,
  },
  {
    label: 'Team Members',
    description: 'Team introduction slide',
    icon: '👥',
    category: 'Business',
    snippet: `- type: team
  title: "Our Team"
  members:
    - name: "Jane Smith"
      role: "CEO & Founder"
      bio: "20+ years in tech leadership"
    - name: "John Doe"
      role: "CTO"
      bio: "Former Apple engineer"
    - name: "Sarah Johnson"
      role: "Head of Design"
      bio: "Award-winning product designer"`,
  },
  {
    label: 'Meeting Agenda',
    description: 'Schedule and topics',
    icon: '📅',
    category: 'Business',
    snippet: `- type: agenda
  title: "Today's Agenda"
  sections:
    - time: "9:00 AM"
      title: "Welcome & Introductions"
      duration: "15 min"
    - time: "9:15 AM"
      title: "Q4 Performance Review"
      duration: "30 min"
      speaker: "Jane Smith"
    - time: "9:45 AM"
      title: "2024 Strategy"
      duration: "45 min"
      speaker: "John Doe"`,
  },

  // Visual Slides
  {
    label: 'Testimonial',
    description: 'Customer quote or review',
    icon: '💬',
    category: 'Visual',
    snippet: `- type: testimonial
  testimonials:
    - quote: "This product has transformed how we work. The impact on our productivity has been remarkable."
      author: "Sarah Chen"
      role: "VP of Engineering"
      company: "TechCorp"
      rating: 5`,
  },
  {
    label: 'Image Gallery',
    description: 'Showcase multiple images',
    icon: '🖼️',
    category: 'Visual',
    snippet: `- type: gallery
  title: "Product Showcase"
  images:
    - src: "/image1.jpg"
      alt: "Product feature 1"
      caption: "Intuitive dashboard"
    - src: "/image2.jpg"
      alt: "Product feature 2"
      caption: "Advanced analytics"
    - src: "/image3.jpg"
      alt: "Product feature 3"
      caption: "Team collaboration"`,
  },
  {
    label: 'Summary Points',
    description: 'Key takeaways and highlights',
    icon: '📌',
    category: 'Visual',
    snippet: `- type: summary
  title: "Key Takeaways"
  highlights:
    - "Revenue increased by 45% year-over-year"
    - "Successfully launched in 3 new markets"
    - "Customer satisfaction score improved to 4.8/5"
    - "Team expanded from 50 to 120 employees"`,
  },
  {
    label: 'Code Example',
    description: 'Syntax highlighted code',
    icon: '💻',
    category: 'Visual',
    snippet: `- type: code
  title: "Implementation Example"
  language: javascript
  highlight: [3, 4]
  content: |
    function processData(input) {
      const parsed = JSON.parse(input);
      const result = transform(parsed);
      return formatOutput(result);
    }`,
  },
  {
    label: 'Comparison',
    description: 'Side-by-side comparison',
    icon: '⚖️',
    category: 'Visual',
    snippet: `- type: comparison
  title: "Plan Comparison"
  items:
    before:
      title: "Basic Plan"
      points:
        - "10 GB Storage"
        - "Basic Support"
        - "5 Team Members"
    after:
      title: "Pro Plan"
      points:
        - "100 GB Storage"
        - "Priority Support"
        - "Unlimited Team Members"
        - "Advanced Analytics"`,
  },
]
