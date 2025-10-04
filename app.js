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
    let currentProcess = null;
    let currentQuantumRemaining = 0;


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
        let row = $(this).closest('tr');
        let pid = parseInt(row.find('td:first').text());
        processList = processList.filter(p => p.processID !== pid);
        row.remove();
    });

    // ==========================
    // Prefill Inputs & Populate Table
    // ==========================
    $('#processID').val(defaultProcesses[0].pid);
    $('#arrivalTime').val(defaultProcesses[0].at);
    $('#burstTime').val(defaultProcesses[0].bt);
    $('#priority').val(defaultProcesses[0].pr);

    defaultProcesses.forEach(p => {
        let proc = {
            processID: p.pid,
            arrivalTime: p.at,
            burstTime: p.bt,
            originalBurstTime: p.bt,
            priority: p.pr,
            waitingTime: 0,
            lastExecutedAt: null,
            timeProcessed: 0,
        };
        processList.push(proc);

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
    // FIXED: Editable Table Cell Validation (moved outside)
    // ==========================
    $('#tblProcessList').on('blur', 'td[contenteditable="true"]', function () {
        let row = $(this).closest('tr');
        let rowIndex = row.index();
        let colIndex = $(this).index();
        let newValue = $(this).text().trim();
        let oldPID = parseInt(row.find('td:eq(0)').data('original-value') || row.find('td:eq(0)').text());

        // Must not be blank
        if (newValue === '') {
            alert("Field cannot be empty!");
            $(this).text($(this).data('original-value') || "1");
            return;
        }

        // Must be numeric
        if (isNaN(newValue)) {
            alert("Value must be a number!");
            $(this).text($(this).data('original-value') || "1");
            return;
        }

        newValue = parseInt(newValue);

        // Apply rules depending on column
        switch (colIndex) {
            case 0: // Process ID
                if (newValue <= 0) {
                    alert("Process ID must be greater than 0!");
                    $(this).text($(this).data('original-value') || "1");
                    return;
                }
                // Check for duplicate PID
                let duplicate = false;
                $('#tblProcessList tbody tr').each(function(idx) {
                    if (idx !== rowIndex && parseInt($(this).find('td:eq(0)').text()) === newValue) {
                        duplicate = true;
                        return false;
                    }
                });
                if (duplicate) {
                    alert("Process ID already exists!");
                    $(this).text($(this).data('original-value') || "1");
                    return;
                }
                break;

            case 1: // Arrival Time
                if (newValue < 0 || newValue > 50) {
                    alert("Arrival Time must be between 0 and 50!");
                    $(this).text($(this).data('original-value') || "0");
                    return;
                }
                break;

            case 2: // Burst Time
                if (newValue <= 0 || newValue > 50) {
                    alert("Burst Time must be between 1 and 50!");
                    $(this).text($(this).data('original-value') || "1");
                    return;
                }
                break;

            case 3: // Priority
                if (newValue < 1 || newValue > 3) {
                    alert("Priority must be 1, 2, or 3!");
                    $(this).text($(this).data('original-value') || "1");
                    return;
                }
                break;
        }

        // FIXED: Update processList array when table is edited
        let pid = parseInt(row.find('td:eq(0)').text());
        let process = processList.find(p => p.processID === oldPID);
        
        if (process) {
            process.processID = parseInt(row.find('td:eq(0)').text());
            process.arrivalTime = parseInt(row.find('td:eq(1)').text());
            process.burstTime = parseInt(row.find('td:eq(2)').text());
            process.originalBurstTime = parseInt(row.find('td:eq(2)').text());
            process.priority = parseInt(row.find('td:eq(3)').text());
        }
    });

    // Store original value on focus
    $('#tblProcessList').on('focus', 'td[contenteditable="true"]', function () {
        $(this).data('original-value', $(this).text());
    });

    // ==========================
    // Add New Process Button
    // ==========================
    $('#btnAddProcess').on('click', function () {
        let pid = $('#processID').val();
        let at = $('#arrivalTime').val();
        let bt = $('#burstTime').val();
        let pr = $('#priority').val();

        // Input Validations
        if (pid === '' || at === '' || bt === '' || pr === '') {
            alert('Fill all fields!');
            return;
        }

        pid = parseInt(pid);
        at = parseInt(at);
        bt = parseInt(bt);
        pr = parseInt(pr);

        if (isNaN(pid) || isNaN(at) || isNaN(bt) || isNaN(pr)) {
            alert('All values must be numbers!');
            return;
        }

        if (pid <= 0) {
            alert('Process ID must be greater than 0!');
            return;
        }

        if (at < 0 || at > 50) {
            alert('Arrival time must be between 0 and 50!');
            return;
        }

        if (bt <= 0 || bt > 50) {
            alert('Burst time must be between 1 and 50!');
            return;
        }

        if (pr < 1 || pr > 3) {
            alert('Priority must be between 1 and 3!');
            return;
        }

        // FIXED: Check for duplicate Process ID
        if (processList.some(p => p.processID === pid)) {
            alert('Process ID already exists!');
            return;
        }

        // Process Object
        let proc = {
            processID: pid,
            arrivalTime: at,
            burstTime: bt,
            originalBurstTime: bt,
            priority: pr,
            waitingTime: 0,
            lastExecutedAt: null,
            timeProcessed: 0,
        };

        processList.push(proc);

        // Add to Table
        $('#tblProcessList tbody').append(
            `<tr>
                <td contenteditable="true">${proc.processID}</td>
                <td contenteditable="true">${proc.arrivalTime}</td>
                <td contenteditable="true">${proc.burstTime}</td>
                <td contenteditable="true">${proc.priority}</td>
                <td><button class="btn btn-danger btn-sm btnDelete">Delete</button></td>
            </tr>`
        );

        // Reset Input Fields
        $('#processID').val(pid + 1);
        $('#arrivalTime').val('');
        $('#burstTime').val('');
        $('#priority').val('');
    });


    // ==========================
    // Prefill simulation parameters
    // ==========================
    $('#timeQuantum').val(3);
    $('#aging').val(5);
    $('#priorityDecrease').val(6);

    // ==========================
    // FIXED: Reset Simulation Function
    // ==========================
    function resetSimulation(){
        simulationTime = 0;
        schedule = [];
        completedList = [];
        queues = {};
        currentProcess = null;           // FIXED: Reset current process
        currentQuantumRemaining = 0;     // FIXED: Reset quantum remaining

        // Deep copy of processes for simulation
        allProcesses = processList.map(p => ({...p}));

        // Create queues by priority
        let priorities = [...new Set(allProcesses.map(p=>p.priority))].sort((a,b)=>a-b);
        for(let p of priorities) queues[p]=[];

        // FIXED: Validate simulation parameters
        quantum = parseInt($('#timeQuantum').val());
        agingTime = parseInt($('#aging').val());
        priorityDecreaseTime = parseInt($('#priorityDecrease').val());

        if (isNaN(quantum) || quantum <= 0) {
            alert('Time Quantum must be a positive number!');
            return false;
        }
        if (isNaN(agingTime) || agingTime <= 0) {
            alert('Aging Time Units must be a positive number!');
            return false;
        }
        if (isNaN(priorityDecreaseTime) || priorityDecreaseTime <= 0) {
            alert('Priority Decrease Units must be a positive number!');
            return false;
        }

        // Clear previous results
        $('#tblResults tbody').empty();
        $('#ganttChart').empty();
        $('#avgTurnaroundTime').val('');
        $('#avgWaitingTime').val('');
        $('#throughput').val('');
        
        // FIXED: Clear priority queues display
        for(let pr = 1; pr <= 3; pr++){
            $(`#queue${pr} .queue-content`).empty();
        }

        return true; // FIXED: Return success status
    }

    // ==========================
    // Simulation Buttons
    // ==========================
    $('#btnCalculate').on('click', function(){
        if(processList.length === 0){
            alert('Insert some processes first!');
            return;
        }
        if(!resetSimulation()) return; // FIXED: Check if reset was successful
        $('#nextBtnWrapper').hide();
        runFullSimulation();
    });

    $('#btnStepByStep').on('click', function(){
        if(processList.length === 0){
            alert('Insert some processes first!');
            return;
        }
        if(!resetSimulation()) return; // FIXED: Check if reset was successful
        $('#nextBtnWrapper').show();
        runNextUnit();
    });

    $('#btnNextTime').on('click', function(){
        if(allProcesses.length>0 || Object.values(queues).some(q=>q.length>0) || currentProcess){
            runNextUnit();
        } else {
            alert('Simulation completed!');
        }
    });

    // ==========================
    // Full Simulation Logic
    // ==========================
    function runFullSimulation(){
        while(allProcesses.length>0 || Object.values(queues).some(q=>q.length>0) || currentProcess){
            runNextUnit();
        }
        updateResults();
    }

    // ==========================
    // Step-by-Step / Next Unit Simulation
    // ==========================
    function runNextUnit() {
        // 1. Add newly arrived processes to queues
        addArrivals();
        applyAging();
        drawPriorityQueues();

        // 2. Select a process if none running or quantum expired
        if (!currentProcess || currentQuantumRemaining === 0) {
            let pr = getHighestPriority();
            if (pr === null) {
                // CPU idle
                schedule.push({ processId: null, start: simulationTime, duration: 1 });
                simulationTime++;
                drawGanttChart();
                return;
            }
            currentProcess = queues[pr].shift();
            currentProcess.waitingInQueue = 0;
            currentQuantumRemaining = Math.min(currentProcess.burstTime, quantum);
        }

        // 3. Execute process for 1 unit
        currentProcess.burstTime--;
        currentProcess.timeProcessed++;
        currentProcess.lastExecutedAt = simulationTime;
        schedule.push({ processId: currentProcess.processID, start: simulationTime, duration: 1 });
        simulationTime++;
        currentQuantumRemaining--;

        // 4. Check if finished
        if (currentProcess.burstTime === 0) {
            currentProcess.completedTime = simulationTime;
            currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
            currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.originalBurstTime;
            completedList.push(currentProcess);
            currentProcess = null;
            currentQuantumRemaining = 0;
        } else if (currentQuantumRemaining === 0 && currentProcess.burstTime > 0) {
            // Preempt only if not finished
            queues[currentProcess.priority] = queues[currentProcess.priority] || [];
            queues[currentProcess.priority].push(currentProcess);
            currentProcess = null;
        }

        // 5. Update results if done
        if (allProcesses.length === 0 && Object.values(queues).every(q => q.length === 0) && !currentProcess) {
            updateResults();
        }

        drawGanttChart();
    }

    function drawPriorityQueues(){
        for(let pr = 1; pr <= 3; pr++){
            let container = $(`#queue${pr} .queue-content`);
            container.empty();
            if(queues[pr] && queues[pr].length > 0){
                queues[pr].forEach(p=>{
                    let block = $('<div class="queue-block"></div>');
                    block.text(`P${p.processID} (${p.burstTime})`);
                    container.append(block);
                });
            }
        }
    }

    // ==========================
    // Helper Functions
    // ==========================
    
    function addArrivals(){
        for(let i=allProcesses.length-1;i>=0;i--){
            if(allProcesses[i].arrivalTime<=simulationTime){
                let p = allProcesses.splice(i,1)[0];
                if(!queues[p.priority]) queues[p.priority]=[];
                queues[p.priority].push(p);
            }
        }
    }

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

    function getHighestPriority(){
        let keys=Object.keys(queues).map(Number).sort((a,b)=>a-b);
        for(let k of keys) if(queues[k].length>0) return k;
        return null;
    }

    function drawGanttChart(){
        const container = $('#ganttChart');
        container.empty();

        // Outer wrapper using grid for alignment
        let chartGrid = $('<div class="gantt-grid"></div>');
        chartGrid.css({
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(30px, 1fr)', // each unit stretches evenly
            textAlign: 'center'
        });

        // Build one cell per schedule unit
        for(let i=0; i<schedule.length; i++){
            let s = schedule[i];

            let cell = $('<div class="gantt-cell"></div>');
            cell.css({
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #ddd',
                minWidth: '30px'
            });

            // Process block
            let block = $('<div class="gantt-block"></div>');
            block.css({
                flex: '1',
                backgroundColor: s.processId ? randomColor(s.processId) : '#ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                minHeight: '30px'
            });
            block.text(s.processId ? 'P'+s.processId : 'Idle');

            // Time label
            let timeLabel = $('<div class="gantt-time"></div>');
            timeLabel.css({
                fontSize: '10px',
                borderTop: '1px solid #999'
            });
            timeLabel.text(s.start);

            cell.append(block);
            cell.append(timeLabel);
            chartGrid.append(cell);
        }

        container.append(chartGrid);
    }

    function randomColor(seed){
        const colors=["#007bff","#28a745","#dc3545","#ffc107","#17a2b8"];
        return colors[seed%colors.length];
    }

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