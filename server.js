const express = require('express');
const path = require('path');
const fs = require('fs');
const shortid = require('shortid');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const port = process.env.PORT || 3333;

app.get('/api/getTasksForToday', (req, res) => {
    res.json(getTaskList());
});

app.post('/api/setTasksForToday', (req, res) => {
    setTaskDataForDate(getToday(), new Map(req.body));
    res.json(null);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

function getToday() {
    return new Date();
}

function getTaskDataForDate(date) {
    let tasks;
    try {
        tasks = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'data', `${getDateString(date)}.json`))));
    } catch (error) {
        tasks = new Map();
    }

    return tasks;
}

function setTaskDataForDate(date, overrides) {
    try {
        let tasks = getTaskDataForDate(date);

        for (var [key, value] of overrides.entries()) {
            tasks.set(key, value);
            console.log(`Set "${key}" to "${value}" for ${getDateString(date)}`);
        }

        fs.writeFileSync(path.join(__dirname, 'data', `${getDateString(date)}.json`), JSON.stringify([...tasks.entries()], null, 4));
    } catch (error) {}
}

function getDateString(date) {
    return `${(date.getMonth() + 1)}-${(date.getDate())}-${(date.getFullYear())}`;
}

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

    if (anyChangesMade) {
        fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 4));
    }

    // Look up data the user has saved for each task for the current date
    let data = getTaskDataForDate(getToday());
    for (let task of tasks) {
        if (data.has(task.id)) {
            task.value = data.get(task.id);
        }
    }

    return tasks;
}