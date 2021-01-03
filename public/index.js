// State variables
let tasks = null;
let isRefreshing = false;
let lastTimeRefreshed = null;
let automaticRefreshInterval = 10 * 1000; // 10 seconds
let renderedTasks = null;

// Call the database and get the updated list of tasks and if they're checked or not
function refresh() {
    isRefreshing = true;

    $.ajax({
        url: '/api/getTasksForToday',
        dataType: 'json',
        success: (data) => {
            isRefreshing = false;
            lastTimeRefreshed = new Date();
            console.log(`Refreshed at ${lastTimeRefreshed}`);
            tasks = data;
            renderTasks();
        }
    });
}

// Render the content for tasks. Automatically quits if nothing has changed
function renderTasks() {
    if (!_.isEqual(tasks, renderedTasks)) {
        $('#content').empty();

        for (let task of tasks) {
            let isChecked = !!task.value;
            let textColor = isChecked ? 'text-primary text-decoration-line-through' : 'text-body';
            let iconColor = isChecked ? 'text-primary' : 'text-body';
            let checkedAttribute = isChecked ? 'checked' : '';

            let taskElement = $(`
                <div class="form-check form-control-lg">
                    <input class="form-check-input" type="checkbox" value="" id="${task.id}" ${checkedAttribute}>
                    <label class="form-check-label d-flex" for="${task.id}">
                        <div class="d-flex align-items-center justify-content-center me-1" style="width: 30px"><i class="${iconColor} ${task.icon}"></i></div>
                        <div class="${textColor}">${task.name}</div>
                    </label>
                </div>
            `);

            // Attach change handler. We want to save the value to the database whenever the checkbox state changes
            let checkbox = taskElement.find('input');
            checkbox.change(function() {
                setTaskValue(this.id, !!this.checked);
                renderTasks();
            });

            $('#content').append(taskElement);
        }

        // Save the state of what we've rendered so we know when we can skip rendering
        renderedTasks = _.cloneDeep(tasks);
    } else {
        console.log('Skipping re-render, content is unchanged');
    }
}

// Run every frame the page is open
function onAnimationFrame() {
    // Refresh the page content every X seconds to pull in changes from other clients
    if (!isRefreshing && lastTimeRefreshed !== null && new Date().getTime() - lastTimeRefreshed.getTime() >= automaticRefreshInterval) {
        refresh();
    }

    requestAnimationFrame(onAnimationFrame);
}

// Call the database and set the value of a specific task.
function setTaskValue(id, value) {
    let serializedData = JSON.stringify([[id, value]]);
    let task = tasks.find(task => task.id === id);

    if (task) {
        task.value = value;
    }

    $.ajax({
        url: '/api/setTasksForToday',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: serializedData
    });
}

// Execute some code as soon as possible after starting the page load
$(document).ready(() => {
    refresh();
    requestAnimationFrame(onAnimationFrame);
});
