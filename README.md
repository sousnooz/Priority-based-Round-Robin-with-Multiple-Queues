# CPU Scheduling Simulator – Priority-based Round Robin with Multiple Queues

This is a web-based CPU scheduling simulator developed for **Operating Systems Laboratory Exercise 3**.  
It combines **priority scheduling** with **round-robin time slicing** and supports multiple queues, process aging, and dynamic priority adjustments.

> The ROUND ROBIN simulation was adapted from [Hirusha Cooray's CPU Scheduling Simulator](https://github.com/hirushacooray/cpu-scheduling-sim),  
> but the entirety of this project, including the addition of priority queues, is our own work. :3

---

## Features

- Add, edit, and delete processes dynamically.
- Default processes preloaded for testing.
- Step-by-step execution or full simulation.
- Time quantum, aging time units, and priority decrease parameters configurable.
- Visual **Gantt chart** representation of process execution.
- Calculates:
  - Turnaround Time
  - Waiting Time
  - Throughput

---

## Default Processes Example

| Process ID | Arrival Time | Burst Time | Priority |
|------------|--------------|------------|----------|
| 1          | 1            | 20         | 3        |
| 2          | 3            | 10         | 2        |
| 3          | 5            | 2          | 1        |
| 4          | 8            | 7          | 2        |
| 5          | 11           | 15         | 3        |
| 6          | 15           | 8          | 2        |
| 7          | 20           | 4          | 1        |

---

## How to Use

1. Open `index.html` in a web browser.
2. Use the input fields to add a new process or edit default processes.
3. Set simulation parameters:
   - Time Quantum
   - Aging Time Units
   - Priority Decrease Units
4. Click **"Show Entire Solution"** to run full simulation or **"Step-by-Step"** to simulate unit by unit.
5. Observe results in the table and the Gantt chart.

---

## Project Structure

├── index.html # Main HTML page
├── style.css # Styles for table, Gantt chart, and layout
├── app.js # Simulation logic and UI interaction
└── README.md # Project documentation
---

## Technologies Used

- HTML5, CSS3, JavaScript (ES6)
- jQuery 3.6
- Bootstrap 4.4 for responsive layout

---

## Authors
- RODIL, Samantha Neiya (sousnooz)

---

## License

This project is for **educational purposes** and is not intended for commercial use.
