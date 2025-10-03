$(document).ready(function(){

    // ==========================
    // Variables Initialization
    // ==========================
    let processList = [];        // List of all processes currently in the table
    let schedule = [];           // Array of scheduled time units for Gantt chart
    let simulationTime = 0;      // Current simulation time
    let queues = {};             // Queues by priority for scheduling
    let allProcesses = [];       // Deep copy of processList for simulation
    let completedList = [];      // Processes that have completed execution
    let quantum = 0;             // Time quantum for round-robin
    let agingTime = 0;           // Time units after which priority aging occurs
    let priorityDecreaseTime = 0;// Time units after which priority may decrease

    // Default processes (editable by user)
    let defaultProcesses = [
        {pid: 1, at: 1, bt: 20, pr: 3},
        {pid: 2, at: 3, bt: 10, pr: 2},
        {pid: 3, at: 5, bt: 2, pr: 1},
        {pid: 4, at: 8, bt: 7, pr: 2},
        {pid: 5, at: 11, bt: 15, pr: 3},
        {pid: 6, at: 15, bt: 8, pr: 2},
        {pid: 7, at: 20, bt: 4, pr: 1},
    ];

    // ==========================
    // Delete Process Button
    // ==========================
    $('#tblProcessList').on('click', '.btnDelete', function(){
        let row = $(this).closest('tr');                   // Get the row of the clicked button
        let pid = parseInt(row.find('td:first').text());   // Get the processID
        processList = processList.filter(p => p.processID !== pid); // Remove from processList
        row.remove();                                     // Remove row from table
    });

    // ==========================
    // Prefill Inputs & Populate Table
    // ==========================
    // Prefill input fields with first default process
    $('#processID').val(defaultProcesses[0].pid);
    $('#arrivalTime').val(defaultProcesses[0].at);
    $('#burstTime').val(defaultProcesses[0].bt);
    $('#priority').val(defaultProcesses[0].pr);

    // Populate process table with defaultProcesses
    defaultProcesses.forEach(p => {
        let proc = {
            processID: p.pid,
            arrivalTime: p.at,
            burstTime: p.bt,
            originalBurstTime: p.bt, // keep original for calculations
            priority: p.pr,
            waitingTime: 0,
            lastExecutedAt: null,
            timeProcessed: 0,
        };
        processList.push(proc);

        // Append to HTML table
        $('#tblProcessList tbody').append(
            `<tr>
                <td contenteditable="true">${proc.processID}</td>
                <td contenteditable="true">${proc.arrivalTime}</td>
                <td contenteditable="true">${proc.burstTime}</td>
                <td contenteditable="true">${proc.priority}</td>
                <td><button class="btn btn-danger btn-sm btnDelete">Delete</button></td>
            </tr>`
        );
    });

    // ==========================
    // Add New Process Button
    // ==========================
    $('#btnAddProcess').on('click', function(){
        let pid = $('#processID').val();
        let at = $('#arrivalTime').val();
        let bt = $('#burstTime').val();
        let pr = $('#priority').val();

        // Validate input fields
        if(pid===''||at===''||bt===''||pr===''){
            alert('Fill all fields!');
            return;
        }

        // Create new process object
        let proc = {
            processID: parseInt(pid),
            arrivalTime: parseInt(at),
            burstTime: parseInt(bt),
            originalBurstTime: parseInt(bt),
            priority: parseInt(pr),
            waitingTime:0,
            lastExecutedAt:null,
            timeProcessed:0,
        };

        processList.push(proc);

        // Append new process to table
        $('#tblProcessList tbody').append(
            `<tr>
                <td contenteditable="true">${proc.processID}</td>
                <td contenteditable="true">${proc.arrivalTime}</td>
                <td contenteditable="true">${proc.burstTime}</td>
                <td contenteditable="true">${proc.priority}</td>
                <td><button class="btn btn-danger btn-sm btnDelete">Delete</button></td>
            </tr>`
        );

        // Reset input fields
        $('#processID').val(parseInt(pid)+1);
        $('#arrivalTime').val('');
        $('#burstTime').val('');
        $('#priority').val('');
    });

    // ==========================
    // Prefill simulation parameters
    // ==========================
    $('#timeQuantum').val(3);       // default quantum
    $('#aging').val(5);             // default aging time
    $('#priorityDecrease').val(6);  // default priority decrease time

    // ==========================
    // Reset Simulation Function
    // ==========================
    function resetSimulation(){
        simulationTime=0;
        schedule=[];
        completedList=[];
        queues={};

        // Deep copy of processes for simulation
        allProcesses = processList.map(p => ({...p}));

        // Create queues by priority
        let priorities = [...new Set(allProcesses.map(p=>p.priority))].sort((a,b)=>a-b);
        for(let p of priorities) queues[p]=[];

        // Read simulation parameters
        quantum = parseInt($('#timeQuantum').val());
        agingTime = parseInt($('#aging').val());
        priorityDecreaseTime = parseInt($('#priorityDecrease').val());

        // Clear previous results
        $('#tblResults tbody').empty();
        $('#ganttChart').empty();
    }

    // ==========================
    // Simulation Buttons
    // ==========================
    $('#btnCalculate').on('click', function(){
        if(processList.length === 0){
            alert('Insert some processes first!');
            return;
        }
        resetSimulation();
        $('#nextBtnWrapper').hide(); // hide step-by-step
        runFullSimulation();
    });

    $('#btnStepByStep').on('click', function(){
        if(processList.length === 0){
            alert('Insert some processes first!');
            return;
        }
        resetSimulation();
        $('#nextBtnWrapper').show();
        runNextUnit();
    });

    $('#btnNextTime').on('click', function(){
        if(allProcesses.length>0 || Object.values(queues).some(q=>q.length>0)){
            runNextUnit();
        } else {
            alert('Simulation completed!');
        }
    });

    // ==========================
    // Full Simulation Logic
    // ==========================
    function runFullSimulation(){
        while(allProcesses.length>0 || Object.values(queues).some(q=>q.length>0)){
            runNextUnit();
        }
        updateResults();
    }

    // ==========================
    // Step-by-Step Simulation
    // ==========================
    function runNextUnit(){
        addArrivals();
        applyAging();

        let currentPriority = getHighestPriority();
        if(currentPriority===null){
            schedule.push({processId:null, start:simulationTime, duration:1});
            simulationTime++;
            drawGanttChart();
            return;
        }

        let proc = queues[currentPriority].shift();
        let timeSlice = Math.min(proc.burstTime, quantum);

        for(let t=0;t<timeSlice;t++){
            simulationTime++;
            proc.burstTime--;
            proc.timeProcessed++;
            proc.lastExecutedAt=simulationTime;

            addArrivals();
            applyAging();

            // Preemption check
            let hp = getHighestPriority();
            if(hp!==null && hp < proc.priority && proc.burstTime>0){
                if(!queues[proc.priority]) queues[proc.priority]=[];
                queues[proc.priority].push(proc);
                proc=null;
                break;
            }

            schedule.push({processId:proc.processID, start:simulationTime-1, duration:1});
        }

        // Requeue or complete process
        if(proc && proc.burstTime>0){
            if(proc.timeProcessed>=priorityDecreaseTime){
                proc.priority++;
                proc.timeProcessed=0;
            }
            if(!queues[proc.priority]) queues[proc.priority]=[];
            queues[proc.priority].push(proc);
        } else if(proc && proc.burstTime===0){
            proc.completedTime=simulationTime;
            proc.turnAroundTime=proc.completedTime-proc.arrivalTime;
            proc.waitingTime=proc.turnAroundTime-proc.originalBurstTime;
            completedList.push(proc);
        }

        drawGanttChart();

        if(allProcesses.length===0 && Object.values(queues).every(q=>q.length===0)){
            updateResults();
        }
    }

    // ==========================
    // Helper Functions
    // ==========================
    
    // Add newly arrived processes to their queues
    function addArrivals(){
        for(let i=allProcesses.length-1;i>=0;i--){
            if(allProcesses[i].arrivalTime<=simulationTime){
                let p = allProcesses.splice(i,1)[0];
                if(!queues[p.priority]) queues[p.priority]=[];
                queues[p.priority].push(p);
            }
        }
    }

    // Aging: Increase priority of waiting processes
    function applyAging(){
        for(let p in queues){
            let q=queues[p];
            for(let i=q.length-1;i>=0;i--){
                let proc=q[i];
                let waitTime=(proc.lastExecutedAt===null)? simulationTime-proc.arrivalTime : simulationTime-proc.lastExecutedAt;
                if(waitTime>=agingTime && proc.priority>1){
                    q.splice(i,1);
                    proc.priority--;
                    if(!queues[proc.priority]) queues[proc.priority]=[];
                    queues[proc.priority].push(proc);
                }
            }
        }
    }

    // Get the highest-priority queue with processes
    function getHighestPriority(){
        let keys=Object.keys(queues).map(Number).sort((a,b)=>a-b);
        for(let k of keys) if(queues[k].length>0) return k;
        return null;
    }

    // Draw Gantt chart based on schedule
    function drawGanttChart(){
        const container = $('#ganttChart');
        container.empty();

        let chartDiv = $('<div style="display:flex;align-items:flex-end;"></div>');
        let timeDiv = $('<div style="display:flex;"></div>');

        let lastPid=null;
        let duration=0;

        for(let i=0;i<schedule.length;i++){
            let s=schedule[i];
            if(s.processId===lastPid){
                duration++;
            } else {
                if(lastPid!==null){
                    let block=$('<div class="gantt-block"></div>');
                    block.width(duration*30);
                    block.css('background-color', lastPid?randomColor(lastPid):'#ccc');
                    block.text(lastPid? 'P'+lastPid:'');
                    chartDiv.append(block);

                    for(let j=0;j<duration;j++){
                        let t=$('<div class="gantt-time"></div>').width(30).text(simulationTime - schedule.length + i - duration + j + 1);
                        timeDiv.append(t);
                    }
                }
                lastPid=s.processId;
                duration=1;
            }
        }

        if(lastPid!==null){
            let block=$('<div class="gantt-block"></div>');
            block.width(duration*30);
            block.css('background-color', lastPid?randomColor(lastPid):'#ccc');
            block.text(lastPid? 'P'+lastPid:'');
            chartDiv.append(block);

            for(let j=0;j<duration;j++){
                let t=$('<div class="gantt-time"></div>').width(30).text(simulationTime - duration + j + 1);
                timeDiv.append(t);
            }
        }

        container.append(chartDiv);
        container.append(timeDiv);
    }

    // Generate color for Gantt blocks
    function randomColor(seed){
        const colors=["#007bff","#28a745","#dc3545","#ffc107","#17a2b8"];
        return colors[seed%colors.length];
    }

    // Update results table and summary statistics
    function updateResults(){
        completedList.sort((a,b)=>a.processID-b.processID);
        $('#tblResults tbody').empty();

        completedList.forEach(p=>{
            $('#tblResults tbody').append(
                `<tr>
                    <td>${p.processID}</td>
                    <td>${p.arrivalTime}</td>
                    <td>${p.originalBurstTime}</td>
                    <td>${p.completedTime}</td>
                    <td>${p.waitingTime}</td>
                    <td>${p.turnAroundTime}</td>
                </tr>`
            );
        });

        // Calculate averages
        let totalTurnaround=0,totalWaiting=0,maxComplete=0;
        completedList.forEach(p=>{
            totalTurnaround+=p.turnAroundTime;
            totalWaiting+=p.waitingTime;
            if(p.completedTime>maxComplete) maxComplete=p.completedTime;
        });

        $('#avgTurnaroundTime').val((totalTurnaround/completedList.length).toFixed(2));
        $('#avgWaitingTime').val((totalWaiting/completedList.length).toFixed(2));
        $('#throughput').val((completedList.length/maxComplete).toFixed(2));
    }

});
