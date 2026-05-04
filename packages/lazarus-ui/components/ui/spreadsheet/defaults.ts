export const blankSpreadsheetDocument = `spreadsheet:
  meta:
    title: "New Spreadsheet"
    author: "User"
    version: "1.0"
    
  sheets:
    - name: "Sheet1"
      columns:
        - id: A
          header: ""
          type: text
          width: 140
        - id: B
          header: ""
          type: text
          width: 140
        - id: C
          header: ""
          type: text
          width: 140
      data: []`

export const defaultSpreadsheetDocument = `spreadsheet:
  meta:
    title: "My Spreadsheet"
    author: "Lazarus User"
    version: "1.0"
    
  sheets:
    - name: "Budget"
      columns:
        - id: A
          header: "Category"
          type: text
          width: 150
        - id: B
          header: "Jan"
          type: currency
          format: USD
        - id: C
          header: "Feb"
          type: currency
          format: USD
        - id: D
          header: "Mar"
          type: currency
          format: USD
        - id: E
          header: "Total"
          type: currency
          format: USD
          style: highlight
        - id: F
          header: "Average"
          type: currency
          format: USD
        - id: G
          header: "Trend"
          type: text
          
      data:
        - row: 1
          cells:
            A: "Income"
            B: 5000
            C: 5200
            D: 5100
        - row: 2
          cells:
            A: "Rent"
            B: 1500
            C: 1500
            D: 1500
        - row: 3
          cells:
            A: "Utilities"
            B: 200
            C: 180
            D: 220
        - row: 4
          cells:
            A: "Food"
            B: 600
            C: 550
            D: 650
        - row: 5
          cells:
            A: "Transport"
            B: 300
            C: 320
            D: 280
        - row: 6
          cells:
            A: "Entertainment"
            B: 400
            C: 450
            D: 380
            
      formulas:
        - cell: E1
          value: "=AI: sum B1 to D1"
        - cell: E2
          value: "=AI: sum B2 to D2"
        - cell: E3
          value: "=AI: sum B3 to D3"
        - cell: E4
          value: "=AI: sum B4 to D4"
        - cell: E5
          value: "=AI: sum B5 to D5"
        - cell: E6
          value: "=AI: sum B6 to D6"
        - cell: F1
          value: "=AI: average of B1 to D1"
        - cell: F2
          value: "=AI: average of B2 to D2"
        - cell: F3
          value: "=AI: average of B3 to D3"
        - cell: F4
          value: "=AI: average of B4 to D4"
        - cell: F5
          value: "=AI: average of B5 to D5"
        - cell: F6
          value: "=AI: average of B6 to D6"
        - cell: G1
          value: "=AI: analyze trend B1 to D1"
        - cell: G2
          value: "=AI: analyze trend B2 to D2"
        - cell: G3
          value: "=AI: analyze trend B3 to D3"
        - cell: G4
          value: "=AI: analyze trend B4 to D4"
        - cell: G5
          value: "=AI: analyze trend B5 to D5"
        - cell: G6
          value: "=AI: analyze trend B6 to D6"
        - cell: B8
          value: "=AI: sum all expenses (B2 to B6)"
        - cell: C8
          value: "=AI: sum all expenses (C2 to C6)"
        - cell: D8
          value: "=AI: sum all expenses (D2 to D6)"
        - cell: B9
          value: "=AI: calculate savings (B1 minus B8)"
        - cell: C9
          value: "=AI: calculate savings (C1 minus C8)"
        - cell: D9
          value: "=AI: calculate savings (D1 minus D8)"
          
      formatting:
        - condition: "value < 0"
          style: danger
          range: "B9:D9"
        - condition: "=AI: is highest in row"
          style: success
          range: "B1:D6"
          
    - name: "Analysis"
      columns:
        - id: A
          header: "Metric"
          type: text
          width: 200
        - id: B
          header: "Value"
          type: text
          width: 300
          
      data:
        - row: 1
          cells:
            A: "Average Monthly Income"
        - row: 2
          cells:
            A: "Average Monthly Expenses"
        - row: 3
          cells:
            A: "Savings Rate"
        - row: 4
          cells:
            A: "Highest Expense Category"
        - row: 5
          cells:
            A: "Budget Recommendation"
            
      formulas:
        - cell: B1
          value: "=AI: average income from Budget sheet"
        - cell: B2
          value: "=AI: average total expenses from Budget sheet"
        - cell: B3
          value: "=AI: calculate savings rate as percentage"
        - cell: B4
          value: "=AI: identify highest average expense category"
        - cell: B5
          value: "=AI: provide budget optimization suggestion based on data"`
