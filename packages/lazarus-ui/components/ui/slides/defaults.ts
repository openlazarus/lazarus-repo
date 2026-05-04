import { PresentationDefaults, Theme } from './types'

export const defaultPresentationDefaults: PresentationDefaults = {
  transition: 'fade',
  duration: 0.5,
  codeTheme: 'auto',
}

export const defaultPresentation = `# Slides - Complete Guide & Showcase
# This template demonstrates all slide types and features available

presentation:
  meta:
    title: "Slides Showcase"
    author: "Lazarus Engineering"
    date: ${new Date().toISOString().split('T')[0]}
    theme: minimal
    aspectRatio: "16:9"
    
  defaults:
    transition: fade
    duration: 0.5
    
  slides:
    # 1. Title Slide with gradient background
    - type: title
      title: "Welcome to Slides"
      subtitle: "A complete guide to all slide types and layouts"
      background: gradient-purple
      notes: |
        This is a title slide - perfect for introductions and section breaks.
        Notice the gradient background and centered layout.
        
    # 2. Title slide with buttons
    - type: title
      title: "Get Started Quickly"
      subtitle: "Everything you need in one place"
      content:
        - type: buttons
          items:
            - text: "Documentation"
              url: "/dev/tools/slides/docs"
              style: primary
            - text: "Examples"
              url: "#"
              style: secondary
              
    # 3. Content slide - single column
    - type: content
      title: "Single Column Layout"
      layout: single
      content:
        - type: text
          value: |
            ### Perfect for focused content
            
            This is a single column layout - ideal when you want your audience 
            to focus on one thing at a time. The content is centered and easy to read.
            
        - type: list
          items:
            - "Clean and minimal"
            - "Great for storytelling"
            - "Maximum readability"
            
    # 4. Content slide - two columns
    - type: content
      title: "Two Column Layout"
      layout: two-column
      content:
        left:
          - type: text
            value: |
              ### Left Column
              
              Two-column layouts are perfect for:
              
          - type: list
            items:
              - "Comparisons"
              - "Code + explanation"
              - "Image + text"
              
        right:
          - type: text
            value: |
              ### Right Column
              
              Balance your content beautifully with equal columns.
              
          - type: quote
            text: "Design is not just what it looks like. Design is how it works."
            author: "Steve Jobs"
            
    # 5. Content slide - grid layout
    - type: content
      title: "Grid Layout - Feature Showcase"
      layout:
        type: grid
        columns: 3
        gap: medium
      content:
        - type: feature
          icon: "🎨"
          value: "Beautiful Design"
          description: "Apple-inspired aesthetics"
          
        - type: feature
          icon: "💻"
          value: "Code First"
          description: "Built for developers"
          
        - type: feature
          icon: "🚀"
          value: "Fast"
          description: "Lightning quick"
          
        - type: feature
          icon: "📱"
          value: "Responsive"
          description: "Works everywhere"
          
        - type: feature
          icon: "🔒"
          value: "Secure"
          description: "Your data is safe"
          
        - type: feature
          icon: "♿"
          value: "Accessible"
          description: "For everyone"
          
    # 6. Code slide with syntax highlighting
    - type: code
      title: "Code Slides - With Highlighting"
      language: javascript
      highlight: [3, 4, 5]
      content: |
        // Beautiful syntax highlighting
        function calculateFibonacci(n) {
          if (n <= 1) return n;
          return calculateFibonacci(n - 1) + 
                 calculateFibonacci(n - 2);
        }
        
        // Try it out!
        console.log(calculateFibonacci(10));
      notes: |
        Code slides support:
        - Syntax highlighting for 100+ languages
        - Line highlighting (see lines 3-5)
        - Optional line numbers
        - Copy to clipboard functionality
        
    # 7. Code slide with execution output
    - type: code
      title: "Live Code Execution"
      language: python
      executable: true
      content: |
        # This code can run live during presentations!
        def greet(names):
            for name in names:
                print(f"Hello, {name}!")
        
        greet(["World", "Slides", "Developers"])
      output:
        show: true
        height: 100
        
    # 8. Diagram slide
    - type: diagram
      title: "Diagram Support"
      content: |
        graph LR
          A[Write YAML] --> B[Parse]
          B --> C[Render]
          C --> D[Beautiful Slides]
          
          style A fill:#f9f,stroke:#333,stroke-width:2px
          style D fill:#9f9,stroke:#333,stroke-width:2px
      notes: |
        Diagrams use Mermaid syntax for:
        - Flowcharts
        - Sequence diagrams
        - Gantt charts
        - And more!
        
    # 9. Comparison slide
    - type: comparison
      title: "Traditional vs. Slides"
      items:
        - traditional:
            title: "Traditional Tools"
            icon: "😕"
            points:
              - "Proprietary formats"
              - "No version control"
              - "Limited collaboration"
              - "Vendor lock-in"
          slides:
            title: "Slides"
            icon: "😊"
            points:
              - "Open YAML format"
              - "Git-friendly"
              - "Team collaboration"
              - "Free forever"
              
    # 10. Content with mixed elements
    - type: content
      title: "Rich Content Types"
      layout: single
      content:
        - type: text
          value: "### You can mix different content types:"
          
        - type: list
          style: numbers
          items:
            - "Numbered lists"
            - "Bullet points"
            - "Nested items"
            
        - type: quote
          text: |
            "The best way to predict the future is to invent it."
          author: "Alan Kay"
          
        - type: text
          value: |
            You can also use **markdown** for *emphasis*, \`inline code\`,
            and even include [links](https://example.com).
            
    # 11. List variations
    - type: content
      title: "List Styles"
      layout: two-column
      content:
        left:
          - type: text
            value: "### Bullet Styles"
            
          - type: list
            style: disc
            items:
              - "Default disc bullets"
              - "Clean and simple"
              
          - type: list
            style: circle
            items:
              - "Circle bullets"
              - "Subtle variation"
              
        right:
          - type: text
            value: "### Numbered Lists"
            
          - type: list
            style: numbers
            items:
              - "First item"
              - "Second item"
              - "Third item"
              
          - type: list
            style: none
            items:
              - "No bullets"
              - "Minimal look"
              
    # 12. Background variations
    - type: title
      title: "Gradient Backgrounds"
      subtitle: "Purple gradient example"
      background: gradient-purple
      
    - type: title
      title: "Blue Gradient"
      subtitle: "Another beautiful option"
      background: gradient-blue
      
    - type: title
      title: "Dark Gradient"
      subtitle: "For dramatic effect"
      background: gradient-dark
      
    # 13. Keyboard shortcuts reference
    - type: content
      title: "Keyboard Shortcuts"
      layout: two-column
      content:
        left:
          - type: text
            value: "### Navigation"
            
          - type: list
            style: none
            items:
              - "→ or Space - Next slide"
              - "← - Previous slide"
              - "Home - First slide"
              - "End - Last slide"
              - "1-9 - Jump to slide"
              
        right:
          - type: text
            value: "### Controls"
            
          - type: list
            style: none
            items:
              - "F - Fullscreen"
              - "E - Toggle editor"
              - "B - Black screen"
              - "P - Presenter mode"
              - "Esc - Exit fullscreen"
              
    # 14. Tips and tricks
    - type: content
      title: "Pro Tips"
      layout: single
      content:
        - type: list
          items:
            - text: "Use speaker notes for reminders"
              subItems:
                - "Add 'notes:' to any slide"
                - "Only visible in presenter mode"
                
            - text: "Organize with YAML comments"
              subItems:
                - "Use # for section markers"
                - "Makes navigation easier"
                
            - text: "Version control friendly"
              subItems:
                - "Track changes with Git"
                - "Collaborate via pull requests"
                
    # 15. Thank you slide
    - type: title
      title: "Ready to Create?"
      subtitle: "Start building beautiful presentations today"
      background: gradient-purple
      content:
        - type: text
          value: "Press **E** to toggle the editor and start creating!"
          style:
            align: center
            size: large`

export const themes: Record<string, Theme> = {
  minimal: {
    name: 'minimal',
    colors: {
      background: '#ffffff',
      text: '#1d1d1f',
      primary: '#0066cc',
      secondary: '#86868b',
      accent: '#06c',
      muted: '#f5f5f7',
      border: '#e5e5e5',
      code: {
        background: '#f5f5f7',
        text: '#1d1d1f',
        comment: '#6e7781',
        keyword: '#cf222e',
        string: '#0a3069',
        number: '#0550ae',
        function: '#8250df',
      },
      gradients: {
        purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        blue: 'linear-gradient(135deg, #667eea 0%, #06c 100%)',
        dark: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        light: 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)',
      },
    },
    typography: {
      fontFamily: {
        sans: 'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        mono: 'SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      slide: {
        padding: '4rem',
        gap: '2rem',
      },
      content: {
        gap: '1.5rem',
      },
      grid: {
        gap: {
          small: '1rem',
          medium: '2rem',
          large: '3rem',
        },
      },
    },
    animations: {
      duration: {
        fast: 200,
        normal: 500,
        slow: 800,
      },
      easing: {
        default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },

  dark: {
    name: 'dark',
    colors: {
      background: '#000000',
      text: '#ffffff',
      primary: '#0a84ff',
      secondary: '#98989d',
      accent: '#0a84ff',
      muted: '#1c1c1e',
      border: '#38383a',
      code: {
        background: '#1c1c1e',
        text: '#ffffff',
        comment: '#6c7086',
        keyword: '#ff6ac1',
        string: '#a6e22e',
        number: '#ae81ff',
        function: '#66d9ef',
      },
      gradients: {
        purple: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        blue: 'linear-gradient(135deg, #0a84ff 0%, #0066cc 100%)',
        dark: 'linear-gradient(135deg, #000000 0%, #1c1c1e 100%)',
        light: 'linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)',
      },
    },
    typography: {
      fontFamily: {
        sans: 'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        mono: 'SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      slide: {
        padding: '4rem',
        gap: '2rem',
      },
      content: {
        gap: '1.5rem',
      },
      grid: {
        gap: {
          small: '1rem',
          medium: '2rem',
          large: '3rem',
        },
      },
    },
    animations: {
      duration: {
        fast: 200,
        normal: 500,
        slow: 800,
      },
      easing: {
        default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },

  keynote: {
    name: 'keynote',
    colors: {
      background: '#000000',
      text: '#ffffff',
      primary: '#ff9500',
      secondary: '#8e8e93',
      accent: '#ff9500',
      muted: '#1c1c1e',
      border: '#38383a',
      code: {
        background: '#1c1c1e',
        text: '#ffffff',
        comment: '#6c7086',
        keyword: '#ff6ac1',
        string: '#a6e22e',
        number: '#ae81ff',
        function: '#66d9ef',
      },
      gradients: {
        purple: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        blue: 'linear-gradient(135deg, #0a84ff 0%, #0066cc 100%)',
        dark: 'linear-gradient(135deg, #000000 0%, #1c1c1e 100%)',
        light: 'linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)',
      },
    },
    typography: {
      fontFamily: {
        sans: 'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        mono: 'SF Mono, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
      fontSize: {
        xs: '0.875rem',
        sm: '1rem',
        base: '1.25rem',
        lg: '1.5rem',
        xl: '1.875rem',
        '2xl': '2.25rem',
        '3xl': '3rem',
        '4xl': '3.75rem',
        '5xl': '4.5rem',
      },
      fontWeight: {
        normal: 300,
        medium: 400,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
      },
    },
    spacing: {
      slide: {
        padding: '5rem',
        gap: '3rem',
      },
      content: {
        gap: '2rem',
      },
      grid: {
        gap: {
          small: '1.5rem',
          medium: '2.5rem',
          large: '3.5rem',
        },
      },
    },
    animations: {
      duration: {
        fast: 300,
        normal: 600,
        slow: 1000,
      },
      easing: {
        default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },

  code: {
    name: 'code',
    colors: {
      background: '#1e1e1e',
      text: '#d4d4d4',
      primary: '#569cd6',
      secondary: '#808080',
      accent: '#569cd6',
      muted: '#252526',
      border: '#464647',
      code: {
        background: '#252526',
        text: '#d4d4d4',
        comment: '#6a9955',
        keyword: '#569cd6',
        string: '#ce9178',
        number: '#b5cea8',
        function: '#dcdcaa',
      },
      gradients: {
        purple: 'linear-gradient(135deg, #c586c0 0%, #646cff 100%)',
        blue: 'linear-gradient(135deg, #569cd6 0%, #4fc1ff 100%)',
        dark: 'linear-gradient(135deg, #1e1e1e 0%, #252526 100%)',
        light: 'linear-gradient(135deg, #2d2d30 0%, #252526 100%)',
      },
    },
    typography: {
      fontFamily: {
        sans: 'Segoe UI, system-ui, -apple-system, sans-serif',
        mono: 'Cascadia Code, Consolas, Monaco, "Courier New", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.3,
        normal: 1.6,
        relaxed: 1.8,
      },
    },
    spacing: {
      slide: {
        padding: '3rem',
        gap: '2rem',
      },
      content: {
        gap: '1.5rem',
      },
      grid: {
        gap: {
          small: '1rem',
          medium: '1.5rem',
          large: '2rem',
        },
      },
    },
    animations: {
      duration: {
        fast: 150,
        normal: 300,
        slow: 500,
      },
      easing: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },

  paper: {
    name: 'paper',
    colors: {
      background: '#fffef7',
      text: '#2c3e50',
      primary: '#3498db',
      secondary: '#7f8c8d',
      accent: '#e74c3c',
      muted: '#f5f5dc',
      border: '#d5d5d5',
      code: {
        background: '#f8f8f2',
        text: '#2c3e50',
        comment: '#7f8c8d',
        keyword: '#e74c3c',
        string: '#27ae60',
        number: '#8e44ad',
        function: '#3498db',
      },
      gradients: {
        purple: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
        blue: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        dark: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        light: 'linear-gradient(135deg, #fffef7 0%, #f5f5dc 100%)',
      },
    },
    typography: {
      fontFamily: {
        sans: 'Georgia, Cambria, "Times New Roman", Times, serif',
        mono: 'Courier, "Courier New", monospace',
      },
      fontSize: {
        xs: '0.875rem',
        sm: '1rem',
        base: '1.125rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '1.875rem',
        '3xl': '2.25rem',
        '4xl': '3rem',
        '5xl': '3.75rem',
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.4,
        normal: 1.7,
        relaxed: 2,
      },
    },
    spacing: {
      slide: {
        padding: '4rem',
        gap: '2.5rem',
      },
      content: {
        gap: '2rem',
      },
      grid: {
        gap: {
          small: '1.5rem',
          medium: '2rem',
          large: '2.5rem',
        },
      },
    },
    animations: {
      duration: {
        fast: 250,
        normal: 400,
        slow: 600,
      },
      easing: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
}

export const getTheme = (themeName: string): Theme => {
  return themes[themeName] || themes.minimal
}
