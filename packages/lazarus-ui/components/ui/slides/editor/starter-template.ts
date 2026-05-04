export const starterTemplate = `presentation:
  meta:
    title: "My Presentation"
    author: "Your Name"
    date: "${new Date().toISOString().split('T')[0]}"
    theme: minimal
    aspectRatio: "16:9"
    
  defaults:
    transition: fade
    duration: 0.5
    
  slides:
    - type: title
      title: "Welcome"
      subtitle: "Let's get started"
      background:
        type: gradient
        value: gradient-blue`
