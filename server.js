// Dependencies
const express = require('express');
const shortid = require('shortid');
const path = require('path');
const fs = require('fs');

// Set up webserver
const app = express();
const port = process.env.PORT || 3333; // May move to a cloud provider in the future so check environment variable first
app.use(express.static(path.join(__dirname, 'public'))); // Anything in the public directory will automatically be served
app.use(express.json()); // Request bodies will support JSON parsing

// API endpoint for getting the list of tasks and if they're completed or not for the current date
// No request parameters
// Response is the JSON representation of an array of task objects (see getTaskList)
app.get('/api/getTasksForToday', (req, res) => {
    res.json(getTaskList());
});

// API endpoint for setting if tasks are completed or not for the current date
// Request parameter should be an array of task tuples in the form [id, value]
app.post('/api/setTasksForToday', (req, res) => {
    setTaskDataForDate(getToday(), new Map(req.body));
    res.json(null);
});

// Start listening for requests
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// Gets the current date and time as a Date object
function getToday() {
    return new Date();
}

// Get the path for the JSON file that stores task values for the specified date
function getDataPath(date) {
    let dataFolder = path.join(__dirname, 'data');
    if (!fs.existsSync(dataFolder)) {
        fs.mkdirSync(dataFolder);
    }
    return path.join(dataFolder, `${getDateString(date)}.json`);
}

// Get the string representation of a date, used for data paths and debugging
function getDateString(date) {
    return `${(date.getMonth() + 1)}-${(date.getDate())}-${(date.getFullYear())}`;
}

// Get which tasks have been completed for the specified date
// Returns a Map of task id to value (true for complete, false for incomplete)
function getTaskDataForDate(date) {
    let tasks;
    try {
        tasks = new Map(JSON.parse(fs.readFileSync(getDataPath(date))));
    } catch (error) {
        tasks = new Map();
    }

    return tasks;
}

// Set which tasks have been completed for the specified date
// Defaults to what is stored on disk and values can be overriden on a per task basis
function setTaskDataForDate(date, overrides) {
    let tasks = getTaskDataForDate(date);

    for (var [key, value] of overrides.entries()) {
        tasks.set(key, value);
        console.log(`Set "${key}" to "${getValueStr(value)}" for ${getDateString(date)}`);
    }

    fs.writeFileSync(getDataPath(date), JSON.stringify([...tasks.entries()], null, 4));
}

function getValueStr(taskData) {
    if (taskData != null && typeof taskData === 'object') {
        return JSON.stringify(taskData);
    } else {
        return taskData;
    }
}

// Get the list of tasks and if they are completed or not
// Returns an array of task objects that have the following properties:
//     id: The unique id for the task
//     name: The display name for the task. Allowed to change because we store values by id
//     value: The value of the task. True = complete, false = incomplete.
function getTaskList() {
    let tasksPath = path.join(__dirname, 'tasks.json')
    let tasks = JSON.parse(fs.readFileSync(tasksPath));

    // Assign ids to tasks that don't have them
    let anyChangesMade = false;
    for (let task of tasks) {
        if (!task.id) {
            task.id = shortid.generate();
            anyChangesMade = true;
        }
    }

    // If we assigned ids, save those to disk
    if (anyChangesMade) {
        fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 4));
    }

    // Look up data the user has saved for each task for the current date
    let data = getTaskDataForDate(getToday());
    for (let task of tasks) {
        if (data.has(task.id)) {
            let taskData = data.get(task.id);
            if (taskData != null && typeof taskData === 'object') {
                task.completed = taskData.completed;
                task.value = taskData.value;
            } else {
                task.completed = !!taskData;
            }
        }
    }

    return tasks;
}