# 🧠 ScheduLogic — CPU Scheduling Simulator

ScheduLogic is an interactive web-based simulator that helps visualize and understand CPU scheduling algorithms used in Operating Systems.

---

## 🌐 Live Demo

👉 https://anand-kumar-upadhyay.github.io/ScheduLogic-CPU-Scheduler/

---

## 🚀 Features

* 📊 Supports multiple scheduling algorithms:

  * FCFS (First Come First Serve)
  * SJF (Shortest Job First)
  * SRTF (Shortest Remaining Time First)
  * Round Robin
  * Priority Scheduling (Preemptive & Non-Preemptive)

* 📈 Gantt Chart Visualization

* ⏱ Step-by-step Simulation

* ⚖️ Algorithm Comparison (best suggestion included)

* 📉 Calculates:

  * Waiting Time
  * Turnaround Time
  * CPU Utilization

---

## 🖥️ Tech Stack

* HTML5
* CSS3 (Flexbox, Grid, Animations, Glassmorphism UI)
* JavaScript (DOM Manipulation + Algorithm Logic)

---

## ⚙️ How to Run the Project

1. Clone the repository:

```bash
git clone https://github.com/anand-kumar-upadhyay/ScheduLogic-CPU-Scheduler.git
```

2. Open the project folder

3. Run the project:

* Open `index.html` in your browser

---

## 🧩 How It Works

1. Add processes with Arrival Time, Burst Time, and Priority
2. Select a scheduling algorithm
3. Click **Run Simulation**
4. View:

   * Gantt Chart
   * Metrics (WT, TAT, CPU Utilization)
   * Step-by-step execution

---

## 🧠 Algorithms Implemented

| Algorithm   | Type           |
| ----------- | -------------- |
| FCFS        | Non-Preemptive |
| SJF         | Non-Preemptive |
| SRTF        | Preemptive     |
| Round Robin | Preemptive     |
| Priority    | Both           |

---

## 📊 Example Output

* Gantt Chart showing execution timeline
* Table with Completion Time, WT, TAT
* Comparison of all algorithms

---

## ⚠️ Limitations

* Frontend-only (no backend storage)
* Not optimized for very large inputs

---

## 🚀 Future Improvements

* Add Multilevel Queue Scheduling
* Backend integration
* Save/export results
* Dark mode
* Improved animations
